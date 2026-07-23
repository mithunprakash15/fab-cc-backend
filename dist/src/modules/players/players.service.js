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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const supabase_js_1 = require("@supabase/supabase-js");
const prisma_service_1 = require("../../prisma/prisma.service");
let PlayersService = class PlayersService {
    prisma;
    supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_KEY ?? '');
    constructor(prisma) {
        this.prisma = prisma;
    }
    list() {
        return this.prisma.player.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    get(id) {
        return this.prisma.player.findUniqueOrThrow({
            where: { id },
            include: { user: { select: { email: true } } },
        });
    }
    update(id, data) {
        return this.prisma.player.update({
            where: { id },
            data: {
                ...data,
                ...(data.name ? { normalizedName: data.name.toLowerCase().trim() } : {}),
            },
        });
    }
    deactivate(id) {
        return this.prisma.player.update({ where: { id }, data: { isActive: false } });
    }
    async createLogin(playerId, email, password) {
        const existing = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (existing)
            throw new common_1.ConflictException('Email already registered');
        const user = await this.prisma.user.create({
            data: {
                email: email.toLowerCase(),
                passwordHash: await bcrypt.hash(password, 12),
                role: 'PLAYER',
            },
        });
        return this.prisma.player.update({
            where: { id: playerId },
            data: { userId: user.id },
        });
    }
    async signedUploadUrl(path) {
        const bucket = process.env.SUPABASE_BUCKET ?? 'fabcc-media';
        const { data, error } = await this.supabase.storage
            .from(bucket)
            .createSignedUploadUrl(`${Date.now()}-${path}`);
        if (error)
            throw error;
        return data;
    }
};
exports.PlayersService = PlayersService;
exports.PlayersService = PlayersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlayersService);
//# sourceMappingURL=players.service.js.map