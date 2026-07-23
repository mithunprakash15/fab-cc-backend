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
exports.TrainingController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const training_service_1 = require("./training.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
class CreateTrainingDto {
    date;
    durationMin;
    type;
    intensity;
    notes;
    coach;
    mediaUrls;
}
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateTrainingDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateTrainingDto.prototype, "durationMin", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.TrainingType),
    __metadata("design:type", String)
], CreateTrainingDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], CreateTrainingDto.prototype, "intensity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTrainingDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTrainingDto.prototype, "coach", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateTrainingDto.prototype, "mediaUrls", void 0);
let TrainingController = class TrainingController {
    training;
    constructor(training) {
        this.training = training;
    }
    playerId(req) {
        if (!req.user.playerId)
            throw new common_1.ForbiddenException('No player profile linked');
        return req.user.playerId;
    }
    create(req, dto) {
        return this.training.create(this.playerId(req), dto);
    }
    list(req, since, playerId) {
        const target = req.user.role === 'ADMIN' && playerId ? playerId : this.playerId(req);
        return this.training.list(target, since ? new Date(since) : undefined);
    }
    summary(req, playerId) {
        const target = req.user.role === 'ADMIN' && playerId ? playerId : this.playerId(req);
        return this.training.summary(target);
    }
    remove(req, id) {
        return this.training.remove(id, this.playerId(req));
    }
};
exports.TrainingController = TrainingController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateTrainingDto]),
    __metadata("design:returntype", void 0)
], TrainingController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('since')),
    __param(2, (0, common_1.Query)('playerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TrainingController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('summary'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('playerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TrainingController.prototype, "summary", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TrainingController.prototype, "remove", null);
exports.TrainingController = TrainingController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('training'),
    __metadata("design:paramtypes", [training_service_1.TrainingService])
], TrainingController);
//# sourceMappingURL=training.controller.js.map