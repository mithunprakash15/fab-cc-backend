import { Injectable, Logger } from '@nestjs/common';
import { MatchResult } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CommentaryParserService, ParsedMatch } from './commentary-parser.service';
import { CricheroesParserService } from './cricheroes-parser.service';
import { StatsEngineService } from '../stats/stats-engine.service';
import { RankingService } from '../ranking/ranking.service';

const CLUB_NAME = 'FAB CC';

@Injectable()
export class CommentaryService {
  private readonly logger = new Logger(CommentaryService.name);

  constructor(
    private prisma: PrismaService,
    private parser: CommentaryParserService,
    private cricheroes: CricheroesParserService,
    private statsEngine: StatsEngineService,
    private ranking: RankingService,
  ) {}

  /**
   * Full ingestion pipeline: parse raw text → persist match/innings/balls →
   * auto-create players → derive scorecards → recompute rankings.
   */
  async ingest(raw: string) {
    const parsed = this.parser.parse(raw);
    return this.persist(parsed, raw);
  }

  /**
   * Ingest one or two CricHeroes commentary JSON files (raw JSON strings). They
   * are normalised to the same shape as text commentary and run through the
   * identical persistence + stats + ranking pipeline.
   */
  async ingestJson(files: string[]) {
    const roots = files.map((f) => JSON.parse(f));
    const parsed = this.cricheroes.parse(roots);
    if (!parsed.innings.length) {
      throw new Error('No innings found in the uploaded files.');
    }
    return this.persist(parsed, JSON.stringify(roots).slice(0, 1_000_000));
  }

  /** Shared persistence for both text- and JSON-sourced matches. */
  private async persist(parsed: ParsedMatch, raw: string) {
    // 1. Resolve every unique participant to a Player ONCE, up front. Doing this
    //    outside the write transaction (and once per participant, not once per
    //    ball) keeps the transaction tiny — essential over a remote/high-latency
    //    DB, where a per-ball resolve+insert loop otherwise blows the tx timeout.
    //    Participants are keyed by CricHeroes id when available (exact match),
    //    else by normalized name — so distinct players with similar names
    //    ("Shyam" vs "Shyam Sundar S") no longer collapse together.
    const keyOf = (name: string, chId?: number) =>
      chId != null ? `id:${chId}` : `nm:${name.trim().toLowerCase()}`;

    // Only FAB CC players get Player rows. A participant belongs to FAB CC when
    // they bat in the innings FAB CC bats, or bowl/field in the innings the
    // opponent bats. Opponent players are left as plain names on the ball events.
    const participants = new Map<string, { name: string; chId?: number; isFab: boolean }>();
    const add = (name: string | null | undefined, chId: number | undefined, isFab: boolean) => {
      if (!name) return;
      const key = keyOf(name, chId);
      const prev = participants.get(key);
      participants.set(key, { name, chId, isFab: (prev?.isFab ?? false) || isFab });
    };
    for (const inn of parsed.innings) {
      const fabBatting = inn.battingTeam === CLUB_NAME;
      for (const b of inn.balls) {
        add(b.batter, b.batterId, fabBatting); // batters belong to the batting side
        add(b.dismissedBatter, b.dismissedBatterId, fabBatting);
        add(b.bowler, b.bowlerId, !fabBatting); // bowlers/fielders to the fielding side
        add(b.fielder, b.fielderId, !fabBatting);
      }
    }

    const resolved = new Map<string, { id: string; name: string }>();
    for (const [key, p] of participants) {
      if (!p.isFab) continue; // skip opponent players — FAB CC roster only
      const player = await this.resolvePlayer(this.prisma, p.name, p.chId);
      await this.ensurePlayerLogin(player); // every FAB CC player gets a login
      resolved.set(key, { id: player.id, name: player.name });
    }

    // 2. Persist the match, innings and ball events in a small transaction using
    //    bulk createMany for the balls.
    const match = await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          title: parsed.title,
          opponent: parsed.opponent,
          venue: parsed.venue,
          date: parsed.date,
          overs: parsed.overs,
          resultText: parsed.resultText,
          result: this.inferResult(parsed),
          rawCommentary: raw,
        },
      });

      for (const inn of parsed.innings) {
        const innings = await tx.innings.create({
          data: { matchId: match.id, number: inn.number, battingTeam: inn.battingTeam },
        });

        await tx.ballEvent.createMany({
          data: inn.balls.map((b) => {
            // FAB players resolve to a canonical Player; opponents keep their raw
            // name (no Player row, so dismissedId stays null for opponent batters).
            const batter = resolved.get(keyOf(b.batter, b.batterId));
            const bowler = resolved.get(keyOf(b.bowler, b.bowlerId));
            const fielder = b.fielder ? resolved.get(keyOf(b.fielder, b.fielderId)) : undefined;
            const dismissed = b.dismissedBatter
              ? resolved.get(keyOf(b.dismissedBatter, b.dismissedBatterId))
              : undefined;
            return {
              inningsId: innings.id,
              over: b.over,
              ballInOver: b.ballInOver,
              batterName: batter?.name ?? b.batter,
              bowlerName: bowler?.name ?? b.bowler,
              runsBat: b.runsBat,
              extras: b.extras,
              extraType: b.extraType,
              isFour: b.isFour,
              isSix: b.isSix,
              isWicket: b.isWicket,
              dismissalType: b.dismissalType,
              dismissedId: dismissed?.id ?? null,
              fielderName: fielder?.name ?? b.fielder ?? null,
              commentary: b.raw,
            };
          }),
        });
      }
      return match;
    }, { timeout: 120_000 });

    await this.statsEngine.buildScorecards(match.id);
    await this.ranking.recompute();

    this.logger.log(`Ingested match ${match.id}: ${match.title}`);
    return this.prisma.match.findUniqueOrThrow({
      where: { id: match.id },
      include: {
        innings: {
          include: {
            battingInnings: { include: { player: true }, orderBy: { battingOrder: 'asc' } },
            bowlingSpells: { include: { player: true } },
          },
        },
      },
    });
  }

  /**
   * Resolve a participant to a Player, creating one if unseen.
   * - With a CricHeroes id: match exactly on `cricheroesId` (adopting an existing
   *   name-matched row if it has no id yet). This is authoritative — no fuzzy
   *   matching — so distinct players with similar names stay separate.
   * - Without an id (text commentary): fall back to name + fuzzy matching.
   */
  private async resolvePlayer(tx: any, name: string, cricheroesId?: number) {
    const clean = name.replace(/\s+/g, ' ').trim();
    const normalized = clean.toLowerCase();

    if (cricheroesId != null) {
      const byId = await tx.player.findUnique({ where: { cricheroesId } });
      if (byId) return byId;

      // Adopt a name-matched player from a prior (text) ingest by attaching the id.
      const byName = await tx.player.findUnique({ where: { normalizedName: normalized } });
      if (byName) {
        if (byName.cricheroesId == null) {
          return tx.player.update({ where: { id: byName.id }, data: { cricheroesId } });
        }
        // Name collides with a different id → disambiguate the normalized name.
        return tx.player.create({
          data: { name: clean, normalizedName: `${normalized}#${cricheroesId}`, cricheroesId, autoCreated: true },
        });
      }
      return tx.player.create({
        data: { name: clean, normalizedName: normalized, cricheroesId, autoCreated: true },
      });
    }

    let player = await tx.player.findUnique({ where: { normalizedName: normalized } });
    if (player) return player;

    // Fuzzy: surname/first-name containment against existing roster
    const candidates = await tx.player.findMany({ select: { id: true, normalizedName: true } });
    const parts = normalized.split(' ');
    const fuzzy = candidates.find((c: any) => {
      const cp = c.normalizedName.split(' ');
      return (
        c.normalizedName.includes(normalized) ||
        normalized.includes(c.normalizedName) ||
        (parts.length > 1 && cp.length > 1 && parts[parts.length - 1] === cp[cp.length - 1] && parts[0][0] === cp[0][0])
      );
    });
    if (fuzzy) return tx.player.findUnique({ where: { id: fuzzy.id } });

    player = await tx.player.create({
      data: { name: clean, normalizedName: normalized, autoCreated: true },
    });
    this.logger.log(`Auto-created player "${clean}" from commentary`);
    return player;
  }

  /**
   * Ensure a FAB CC player has a login. Creates a PLAYER user with an email
   * derived from the name (e.g. "GR Vignesh" → gr.vignesh@fabcc.club) and the
   * default password (PLAYER_DEFAULT_PASSWORD, "123") if none exists yet.
   */
  private async ensurePlayerLogin(player: { id: string; name: string; userId?: string | null }) {
    if (player.userId) return;
    const email = await this.uniquePlayerEmail(player.name);
    const password = process.env.PLAYER_DEFAULT_PASSWORD ?? '123';
    const user = await this.prisma.user.create({
      data: { email, passwordHash: await bcrypt.hash(password, 12), role: 'PLAYER' },
    });
    await this.prisma.player.update({ where: { id: player.id }, data: { userId: user.id } });
    this.logger.log(`Created login ${email} for player "${player.name}"`);
  }

  private async uniquePlayerEmail(name: string): Promise<string> {
    const base =
      name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '') || 'player';
    let email = `${base}@fabcc.club`;
    let n = 1;
    while (await this.prisma.user.findUnique({ where: { email } })) {
      email = `${base}${n++}@fabcc.club`;
    }
    return email;
  }

  private inferResult(parsed: ParsedMatch): MatchResult | null {
    const text = parsed.resultText?.toLowerCase();
    if (!text) return null;
    const club = CLUB_NAME.toLowerCase();
    if (text.includes('tie')) return MatchResult.TIED;
    if (text.includes('no result') || text.includes('abandon')) return MatchResult.NO_RESULT;
    if (text.includes(club) && text.includes('won')) return MatchResult.WON;
    if (text.includes('won')) return MatchResult.LOST;
    return null;
  }
}
