import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// One-off: give every existing player without a login a PLAYER account.
// Email is derived from the name ("GR Vignesh" → gr.vignesh@fabcc.club),
// password defaults to "123" (PLAYER_DEFAULT_PASSWORD).

const prisma = new PrismaClient();

async function uniqueEmail(name: string): Promise<string> {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '') || 'player';
  let email = `${base}@fabcc.club`;
  let n = 1;
  while (await prisma.user.findUnique({ where: { email } })) email = `${base}${n++}@fabcc.club`;
  return email;
}

async function main() {
  const password = process.env.PLAYER_DEFAULT_PASSWORD ?? '123';
  const players = await prisma.player.findMany({ where: { userId: null }, orderBy: { name: 'asc' } });
  const created: string[] = [];
  for (const p of players) {
    const email = await uniqueEmail(p.name);
    const user = await prisma.user.create({
      data: { email, passwordHash: await bcrypt.hash(password, 12), role: 'PLAYER' },
    });
    await prisma.player.update({ where: { id: p.id }, data: { userId: user.id } });
    created.push(`${p.name.padEnd(16)} → ${email}`);
  }
  console.log(`Created ${created.length} player login(s) (password "${password}"):`);
  created.forEach((l) => console.log('  ' + l));
}

main().finally(() => prisma.$disconnect());
