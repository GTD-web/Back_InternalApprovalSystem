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
exports.DocumentPublicController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const document_service_1 = require("../services/document.service");
const dtos_1 = require("../dtos");
let DocumentPublicController = class DocumentPublicController {
    constructor(documentService) {
        this.documentService = documentService;
    }
    async getDocument(documentId) {
        return await this.documentService.getDocument(documentId);
    }
};
exports.DocumentPublicController = DocumentPublicController;
__decorate([
    (0, common_1.Get)(':documentId'),
    (0, swagger_1.ApiOperation)({
        summary: '문서 상세 조회 (Public)',
        description: '특정 문서의 상세 정보를 조회합니다.\n\n' +
            '**인증 불필요**\n\n' +
            '**주의:**\n' +
            '- 결재취소 가능 여부(`canCancelApproval`)는 항상 false로 반환됩니다.\n' +
            '- 사용자 ID가 없으므로 사용자별 권한 체크는 수행되지 않습니다.',
    }),
    (0, swagger_1.ApiParam)({
        name: 'documentId',
        description: '문서 ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '문서 상세 조회 성공',
        type: dtos_1.DocumentResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '문서를 찾을 수 없음',
    }),
    __param(0, (0, common_1.Param)('documentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocumentPublicController.prototype, "getDocument", null);
exports.DocumentPublicController = DocumentPublicController = __decorate([
    (0, swagger_1.ApiTags)('문서 관리 (Public)'),
    (0, common_1.Controller)('public/documents'),
    __metadata("design:paramtypes", [document_service_1.DocumentService])
], DocumentPublicController);
//# sourceMappingURL=document-public.controller.js.map