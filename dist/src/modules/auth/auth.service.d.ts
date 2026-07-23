import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
export interface JwtPayload {
    sub: string;
    role: 'ADMIN' | 'PLAYER';
    playerId: string | null;
}
export declare class AuthService {
    private prisma;
    private jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    login(email: string, password: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    registerPushToken(userId: string, pushToken: string): Promise<void>;
    private issueTokens;
}
