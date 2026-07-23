"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentaryModule = void 0;
const common_1 = require("@nestjs/common");
const commentary_controller_1 = require("./commentary.controller");
const commentary_service_1 = require("./commentary.service");
const commentary_parser_service_1 = require("./commentary-parser.service");
const cricheroes_parser_service_1 = require("./cricheroes-parser.service");
const stats_module_1 = require("../stats/stats.module");
const ranking_module_1 = require("../ranking/ranking.module");
let CommentaryModule = class CommentaryModule {
};
exports.CommentaryModule = CommentaryModule;
exports.CommentaryModule = CommentaryModule = __decorate([
    (0, common_1.Module)({
        imports: [stats_module_1.StatsModule, ranking_module_1.RankingModule],
        controllers: [commentary_controller_1.CommentaryController],
        providers: [commentary_service_1.CommentaryService, commentary_parser_service_1.CommentaryParserService, cricheroes_parser_service_1.CricheroesParserService],
    })
], CommentaryModule);
//# sourceMappingURL=commentary.module.js.map