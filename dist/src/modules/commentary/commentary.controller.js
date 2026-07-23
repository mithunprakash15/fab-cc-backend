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
exports.CommentaryController = void 0;
const class_validator_1 = require("class-validator");
const common_1 = require("@nestjs/common");
const commentary_service_1 = require("./commentary.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
class UploadCommentaryDto {
    raw;
}
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadCommentaryDto.prototype, "raw", void 0);
class UploadJsonDto {
    files;
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(2),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UploadJsonDto.prototype, "files", void 0);
let CommentaryController = class CommentaryController {
    service;
    constructor(service) {
        this.service = service;
    }
    upload(dto) {
        return this.service.ingest(dto.raw);
    }
    uploadJson(dto) {
        return this.service.ingestJson(dto.files);
    }
};
exports.CommentaryController = CommentaryController;
__decorate([
    (0, common_1.Post)('upload'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UploadCommentaryDto]),
    __metadata("design:returntype", void 0)
], CommentaryController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)('upload-json'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UploadJsonDto]),
    __metadata("design:returntype", void 0)
], CommentaryController.prototype, "uploadJson", null);
exports.CommentaryController = CommentaryController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.Controller)('commentary'),
    __metadata("design:paramtypes", [commentary_service_1.CommentaryService])
], CommentaryController);
//# sourceMappingURL=commentary.controller.js.map