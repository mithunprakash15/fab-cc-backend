"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commentary_parser_service_1 = require("./commentary-parser.service");
const SAMPLE = `
Match: FAB CC vs Thunder XI, 20 overs
Date: 12 Jul 2026
Venue: Marina Ground
Result: FAB CC won by 24 runs

Innings 1: FAB CC
0.1 Arjun to Vikram, no run
0.2 Arjun to Vikram, FOUR! driven through covers
0.3 Arjun to Vikram, wide
0.4 Arjun to Vikram, 2 runs
0.5 Arjun to Suresh, SIX! over long on
0.6 Arjun to Suresh, 1 run
1.1 Ravi to Suresh, OUT! c Manoj b Ravi
1.2 Ravi to Karthik, lbw, OUT!
1.3 Ravi to Dinesh, run out (Manoj), OUT! Dinesh is run out
1.4 Ravi to Vikram, st Prakash b Ravi, OUT! stumped

Innings 2: Thunder XI
0.1 Vikram to Rohit, 1 run
0.2 Vikram to Amit, bowled! OUT!
`;
describe('CommentaryParserService', () => {
    const parser = new commentary_parser_service_1.CommentaryParserService();
    const match = parser.parse(SAMPLE);
    it('parses match metadata', () => {
        expect(match.opponent).toBe('Thunder XI');
        expect(match.overs).toBe(20);
        expect(match.venue).toBe('Marina Ground');
        expect(match.resultText).toContain('won by 24 runs');
        expect(match.innings).toHaveLength(2);
    });
    it('parses runs, boundaries, and wides', () => {
        const balls = match.innings[0].balls;
        expect(balls[0].runsBat).toBe(0);
        expect(balls[1].isFour).toBe(true);
        expect(balls[1].runsBat).toBe(4);
        expect(balls[2].extraType).toBe('wide');
        expect(balls[2].extras).toBe(1);
        expect(balls[3].runsBat).toBe(2);
        expect(balls[4].isSix).toBe(true);
    });
    it('detects all dismissal types', () => {
        const balls = match.innings[0].balls;
        const caught = balls.find((b) => b.raw.includes('c Manoj'));
        expect(caught.dismissalType).toBe('CAUGHT');
        expect(caught.fielder).toBe('Manoj');
        const lbw = balls.find((b) => b.raw.includes('lbw'));
        expect(lbw.dismissalType).toBe('LBW');
        const runOut = balls.find((b) => b.raw.includes('run out'));
        expect(runOut.dismissalType).toBe('RUN_OUT');
        expect(runOut.fielder).toBe('Manoj');
        const stumped = balls.find((b) => b.raw.includes('st Prakash'));
        expect(stumped.dismissalType).toBe('STUMPED');
        expect(stumped.fielder).toBe('Prakash');
        const bowled = match.innings[1].balls.find((b) => b.raw.includes('bowled'));
        expect(bowled.dismissalType).toBe('BOWLED');
    });
    it('throws a helpful error on unparseable input', () => {
        expect(() => parser.parse('random text')).toThrow(/No innings found/);
    });
});
//# sourceMappingURL=commentary-parser.service.spec.js.map