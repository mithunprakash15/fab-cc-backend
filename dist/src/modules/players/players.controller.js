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
exports.PlayersController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const players_service_1 = require("./players.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
class UpdatePlayerDto {
    name;
    photoUrl;
    jerseyNumber;
    battingStyle;
    bowlingStyle;
    playingRole;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePlayerDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePlayerDto.prototype, "photoUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdatePlayerDto.prototype, "jerseyNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.BattingStyle),
    __metadata("design:type", String)
], UpdatePlayerDto.prototype, "battingStyle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.BowlingStyle),
    __metadata("design:type", String)
], UpdatePlayerDto.prototype, "bowlingStyle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.PlayingRole),
    __metadata("design:type", String)
], UpdatePlayerDto.prototype, "playingRole", void 0);
class CreateLoginDto {
    email;
    password;
}
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateLoginDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], CreateLoginDto.prototype, "password", void 0);
class UploadUrlDto {
    filename;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadUrlDto.prototype, "filename", void 0);
let PlayersController = class PlayersController {
    players;
    constructor(players) {
        this.players = players;
    }
    list() {
        return this.players.list();
    }
    me(req) {
        if (!req.user.playerId)
            throw new common_1.ForbiddenException('No player profile linked');
        return this.players.get(req.user.playerId);
    }
    get(id) {
        return this.players.get(id);
    }
    update(req, id, dto) {
        if (req.user.role !== 'ADMIN' && req.user.playerId !== id) {
            throw new common_1.ForbiddenException('You can only edit your own profile');
        }
        return this.players.update(id, dto);
    }
    deactivate(id) {
        return this.players.deactivate(id);
    }
    createLogin(id, dto) {
        return this.players.createLogin(id, dto.email, dto.password);
    }
    uploadUrl(dto) {
        return this.players.signedUploadUrl(dto.filename);
    }
};
exports.PlayersController = PlayersController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PlayersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PlayersController.prototype, "me", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PlayersController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, UpdatePlayerDto]),
    __metadata("design:returntype", void 0)
], PlayersController.prototype, "update", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PlayersController.prototype, "deactivate", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.Post)(':id/login'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateLoginDto]),
    __metadata("design:returntype", void 0)
], PlayersController.prototype, "createLogin", null);
__decorate([
    (0, common_1.Post)('upload-url'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UploadUrlDto]),
    __metadata("design:returntype", void 0)
], PlayersController.prototype, "uploadUrl", null);
exports.PlayersController = PlayersController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('players'),
    __metadata("design:paramtypes", [players_service_1.PlayersService])
], PlayersController);
//# sourceMappingURL=players.controller.js.map