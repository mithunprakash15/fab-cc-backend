"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function uniqueEmail(name) {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '') || 'player';
    let email = `${base}@fabcc.club`;
    let n = 1;
    while (await prisma.user.findUnique({ where: { email } }))
        email = `${base}${n++}@fabcc.club`;
    return email;
}
async function main() {
    const password = process.env.PLAYER_DEFAULT_PASSWORD ?? '123';
    const players = await prisma.player.findMany({ where: { userId: null }, orderBy: { name: 'asc' } });
    const created = [];
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
//# sourceMappingURL=backfill-logins.js.map