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
exports.CoachController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const coach_service_1 = require("./coach.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
class ChatDto {
    message;
}
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], ChatDto.prototype, "message", void 0);
let CoachController = class CoachController {
    coach;
    constructor(coach) {
        this.coach = coach;
    }
    chat(req, dto) {
        if (!req.user.playerId)
            throw new common_1.ForbiddenException('No player profile linked');
        return this.coach.chat(req.user.sub, req.user.playerId, dto.message);
    }
    history(req) {
        return this.coach.history(req.user.sub);
    }
};
exports.CoachController = CoachController;
__decorate([
    (0, common_1.Post)('chat'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ChatDto]),
    __metadata("design:returntype", void 0)
], CoachController.prototype, "chat", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CoachController.prototype, "history", null);
exports.CoachController = CoachController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('coach'),
    __metadata("design:paramtypes", [coach_service_1.CoachService])
], CoachController);
//# sourceMappingURL=coach.controller.js.map