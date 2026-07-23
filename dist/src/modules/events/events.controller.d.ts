import { AttendanceStatus, EventType, RsvpStatus } from '@prisma/client';
import { EventsService } from './events.service';
declare class CreateEventDto {
    type: EventType;
    title: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    venue?: string;
    latitude?: number;
    longitude?: number;
    coach?: string;
    maxPlayers?: number;
    notes?: string;
}
declare class RsvpDto {
    status: RsvpStatus;
}
declare class AttendanceEntryDto {
    playerId: string;
    status: AttendanceStatus;
}
declare class MarkAttendanceDto {
    records: AttendanceEntryDto[];
}
export declare class EventsController {
    private events;
    constructor(events: EventsService);
    create(dto: CreateEventDto): Promise<{
        id: string;
        createdAt: Date;
        date: Date;
        title: string;
        venue: string | null;
        type: import(".prisma/client").$Enums.EventType;
        description: string | null;
        startTime: Date;
        endTime: Date;
        latitude: number | null;
        longitude: number | null;
        coach: string | null;
        maxPlayers: number | null;
        notes: string | null;
        remindedDayBefore: boolean;
        remindedHourBefore: boolean;
    }>;
    remove(id: string): import(".prisma/client").Prisma.Prisma__EventClient<{
        id: string;
        createdAt: Date;
        date: Date;
        title: string;
        venue: string | null;
        type: import(".prisma/client").$Enums.EventType;
        description: string | null;
        startTime: Date;
        endTime: Date;
        latitude: number | null;
        longitude: number | null;
        coach: string | null;
        maxPlayers: number | null;
        notes: string | null;
        remindedDayBefore: boolean;
        remindedHourBefore: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    list(upcoming?: string): import(".prisma/client").Prisma.PrismaPromise<({
        attendance: {
            id: string;
            playerId: string;
            eventId: string;
            status: import(".prisma/client").$Enums.AttendanceStatus;
            markedAt: Date;
        }[];
        rsvps: ({
            player: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                userId: string | null;
                normalizedName: string;
                cricheroesId: number | null;
                photoUrl: string | null;
                jerseyNumber: number | null;
                battingStyle: import(".prisma/client").$Enums.BattingStyle | null;
                bowlingStyle: import(".prisma/client").$Enums.BowlingStyle;
                playingRole: import(".prisma/client").$Enums.PlayingRole;
                isActive: boolean;
                autoCreated: boolean;
            };
        } & {
            id: string;
            updatedAt: Date;
            playerId: string;
            eventId: string;
            status: import(".prisma/client").$Enums.RsvpStatus;
        })[];
    } & {
        id: string;
        createdAt: Date;
        date: Date;
        title: string;
        venue: string | null;
        type: import(".prisma/client").$Enums.EventType;
        description: string | null;
        startTime: Date;
        endTime: Date;
        latitude: number | null;
        longitude: number | null;
        coach: string | null;
        maxPlayers: number | null;
        notes: string | null;
        remindedDayBefore: boolean;
        remindedHourBefore: boolean;
    })[]>;
    rsvp(id: string, req: any, dto: RsvpDto): Promise<{
        id: string;
        updatedAt: Date;
        playerId: string;
        eventId: string;
        status: import(".prisma/client").$Enums.RsvpStatus;
    }>;
    attendance(id: string, dto: MarkAttendanceDto): Promise<{
        id: string;
        playerId: string;
        eventId: string;
        status: import(".prisma/client").$Enums.AttendanceStatus;
        markedAt: Date;
    }[]>;
    attendanceSummary(playerId: string, since?: string): Promise<{
        total: number;
        percentage: number | null;
        byStatus: {
            present: number;
            late: number;
            excused: number;
            absent: number;
        };
        history: ({
            event: {
                id: string;
                createdAt: Date;
                date: Date;
                title: string;
                venue: string | null;
                type: import(".prisma/client").$Enums.EventType;
                description: string | null;
                startTime: Date;
                endTime: Date;
                latitude: number | null;
                longitude: number | null;
                coach: string | null;
                maxPlayers: number | null;
                notes: string | null;
                remindedDayBefore: boolean;
                remindedHourBefore: boolean;
            };
        } & {
            id: string;
            playerId: string;
            eventId: string;
            status: import(".prisma/client").$Enums.AttendanceStatus;
            markedAt: Date;
        })[];
    }>;
}
export {};
