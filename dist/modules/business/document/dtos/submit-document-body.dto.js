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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitDocumentBodyDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const approval_step_snapshot_dto_1 = require("./approval-step-snapshot.dto");
class SubmitDocumentBodyDto {
}
exports.SubmitDocumentBodyDto = SubmitDocumentBodyDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '문서 템플릿 ID (기안 시점에 지정 가능)',
        example: 'uuid',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SubmitDocumentBodyDto.prototype, "documentTemplateId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '추가 메타데이터 (금액, 날짜 등)',
        example: { amount: 100000, date: '2025-01-01' },
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], SubmitDocumentBodyDto.prototype, "metadata", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '결재단계 스냅샷 목록 (기안 시 결재선 설정, 없으면 기존 스냅샷 사용)',
        type: [approval_step_snapshot_dto_1.ApprovalStepSnapshotItemDto],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => approval_step_snapshot_dto_1.ApprovalStepSnapshotItemDto),
    __metadata("design:type", Array)
], SubmitDocumentBodyDto.prototype, "approvalSteps", void 0);
//# sourceMappingURL=submit-document-body.dto.js.map