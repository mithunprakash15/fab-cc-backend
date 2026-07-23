"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisciplineController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const discipline_service_1 = require("./discipline.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
class ScoreDisciplineDto {
    playerId;
    weekStart;
    attendance;
    punctuality;
    commitment;
    communication;
    respect;
    teamwork;
    sportsmanship;
    helpingOthers;
    behaviour;
    overall;
    comment;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScoreDisciplineDto.prototype, "playerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScoreDisciplineDto.prototype, "weekStart", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], ScoreDisciplineDto.prototype, "attendance", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], ScoreDisciplineDto.prototype, "punctuality", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], ScoreDisciplineDto.prototype, "commitment", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], ScoreDisciplineDto.prototype, "communication", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], ScoreDisciplineDto.prototype, "respect", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], ScoreDisciplineDto.prototype, "teamwork", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], ScoreDisciplineDto.prototype, "sportsmanship", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], ScoreDisciplineDto.prototype, "helpingOthers", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], ScoreDisciplineDto.prototype, "behaviour", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], ScoreDisciplineDto.prototype, "overall", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScoreDisciplineDto.prototype, "comment", void 0);
let DisciplineController = class DisciplineController {
    discipline;
    constructor(discipline) {
        this.discipline = discipline;
    }
    score(dto) {
        return this.discipline.score(dto);
    }
    history(playerId, req) {
        if (req.user.role !== 'ADMIN' && req.user.playerId !== playerId) {
            throw new common_1.ForbiddenException('You can only view your own discipline history');
        }
        return this.discipline.history(playerId);
    }
};
exports.DisciplineController = DisciplineController;
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ScoreDisciplineDto]),
    __metadata("design:returntype", void 0)
], DisciplineController.prototype, "score", null);
__decorate([
    (0, common_1.Get)(':playerId'),
    __param(0, (0, common_1.Param)('playerId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DisciplineController.prototype, "history", null);
exports.DisciplineController = DisciplineController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('discipline'),
    __metadata("design:paramtypes", [discipline_service_1.DisciplineService])
], DisciplineController);
//# sourceMappingURL=discipline.controller.js.map