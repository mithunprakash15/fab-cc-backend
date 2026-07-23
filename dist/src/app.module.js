"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const throttler_1 = require("@nestjs/throttler");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const players_module_1 = require("./modules/players/players.module");
const commentary_module_1 = require("./modules/commentary/commentary.module");
const stats_module_1 = require("./modules/stats/stats.module");
const events_module_1 = require("./modules/events/events.module");
const training_module_1 = require("./modules/training/training.module");
const exercise_module_1 = require("./modules/exercise/exercise.module");
const discipline_module_1 = require("./modules/discipline/discipline.module");
const ranking_module_1 = require("./modules/ranking/ranking.module");
const insights_module_1 = require("./modules/insights/insights.module");
const coach_module_1 = require("./modules/coach/coach.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const health_controller_1 = require("./health.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [health_controller_1.HealthController],
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            players_module_1.PlayersModule,
            commentary_module_1.CommentaryModule,
            stats_module_1.StatsModule,
            events_module_1.EventsModule,
            training_module_1.TrainingModule,
            exercise_module_1.ExerciseModule,
            discipline_module_1.DisciplineModule,
            ranking_module_1.RankingModule,
            insights_module_1.InsightsModule,
            coach_module_1.CoachModule,
            notifications_module_1.NotificationsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map