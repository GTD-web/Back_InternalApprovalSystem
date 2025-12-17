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
exports.DocumentTemplateWithApproversResponseDto = exports.ApprovalStepTemplatesDto = exports.DrafterDto = exports.DrafterDepartmentDto = exports.PositionDto = exports.CategoryResponseDto = exports.ApprovalStepTemplateWithApproversDto = exports.MappedApproverDto = exports.DepartmentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const approval_enum_1 = require("../../../../common/enums/approval.enum");
const department_enum_1 = require("../../../../common/enums/department.enum");
class DepartmentDto {
}
exports.DepartmentDto = DepartmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '부서 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], DepartmentDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '부서명',
        example: '개발팀',
    }),
    __metadata("design:type", String)
], DepartmentDto.prototype, "departmentName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '부서 코드',
        example: 'DEV',
    }),
    __metadata("design:type", String)
], DepartmentDto.prototype, "departmentCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '부서 유형',
        enum: department_enum_1.DepartmentType,
        example: department_enum_1.DepartmentType.DEPARTMENT,
    }),
    __metadata("design:type", String)
], DepartmentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '상위 부서 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], DepartmentDto.prototype, "parentDepartmentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '정렬 순서',
        example: 0,
    }),
    __metadata("design:type", Number)
], DepartmentDto.prototype, "order", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '생성일',
        example: '2025-11-11T00:00:00.000Z',
    }),
    __metadata("design:type", Date)
], DepartmentDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '수정일',
        example: '2025-11-11T00:00:00.000Z',
    }),
    __metadata("design:type", Date)
], DepartmentDto.prototype, "updatedAt", void 0);
class MappedApproverDto {
}
exports.MappedApproverDto = MappedApproverDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '결재자 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], MappedApproverDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '결재자 사번',
        example: 'EMP001',
    }),
    __metadata("design:type", String)
], MappedApproverDto.prototype, "employeeNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '결재자 이름',
        example: '홍길동',
    }),
    __metadata("design:type", String)
], MappedApproverDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '결재자 이메일',
        example: 'hong@example.com',
    }),
    __metadata("design:type", String)
], MappedApproverDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '직책 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], MappedApproverDto.prototype, "positionId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '직책명',
        example: '팀장',
    }),
    __metadata("design:type", String)
], MappedApproverDto.prototype, "positionTitle", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '부서 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], MappedApproverDto.prototype, "departmentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '부서명',
        example: '개발팀',
    }),
    __metadata("design:type", String)
], MappedApproverDto.prototype, "departmentName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '할당 유형',
        example: 'FIXED',
    }),
    __metadata("design:type", String)
], MappedApproverDto.prototype, "type", void 0);
class ApprovalStepTemplateWithApproversDto {
}
exports.ApprovalStepTemplateWithApproversDto = ApprovalStepTemplateWithApproversDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '결재 단계 순서',
        example: 1,
    }),
    __metadata("design:type", Number)
], ApprovalStepTemplateWithApproversDto.prototype, "stepOrder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '결재 단계 타입',
        enum: approval_enum_1.ApprovalStepType,
        example: approval_enum_1.ApprovalStepType.APPROVAL,
    }),
    __metadata("design:type", String)
], ApprovalStepTemplateWithApproversDto.prototype, "stepType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '결재자 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], ApprovalStepTemplateWithApproversDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '결재자 사번',
        example: 'EMP001',
    }),
    __metadata("design:type", String)
], ApprovalStepTemplateWithApproversDto.prototype, "employeeNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '결재자 이름',
        example: '홍길동',
    }),
    __metadata("design:type", String)
], ApprovalStepTemplateWithApproversDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '직책 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], ApprovalStepTemplateWithApproversDto.prototype, "positionId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '직책명',
        example: '팀장',
    }),
    __metadata("design:type", String)
], ApprovalStepTemplateWithApproversDto.prototype, "positionTitle", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '부서 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], ApprovalStepTemplateWithApproversDto.prototype, "departmentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '부서명',
        example: '개발팀',
    }),
    __metadata("design:type", String)
], ApprovalStepTemplateWithApproversDto.prototype, "departmentName", void 0);
class CategoryResponseDto {
}
exports.CategoryResponseDto = CategoryResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '카테고리 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], CategoryResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '카테고리 이름',
        example: '인사',
    }),
    __metadata("design:type", String)
], CategoryResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '카테고리 코드',
        example: 'HR',
    }),
    __metadata("design:type", String)
], CategoryResponseDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '카테고리 설명',
        example: '인사 관련 문서',
    }),
    __metadata("design:type", String)
], CategoryResponseDto.prototype, "description", void 0);
class PositionDto {
}
exports.PositionDto = PositionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '직책 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], PositionDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '직책명',
        example: '팀장',
    }),
    __metadata("design:type", String)
], PositionDto.prototype, "positionTitle", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '직책 코드',
        example: 'MANAGER',
    }),
    __metadata("design:type", String)
], PositionDto.prototype, "positionCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '직책 레벨',
        example: 3,
    }),
    __metadata("design:type", Number)
], PositionDto.prototype, "level", void 0);
class DrafterDepartmentDto {
}
exports.DrafterDepartmentDto = DrafterDepartmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '부서 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], DrafterDepartmentDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '부서명',
        example: '개발팀',
    }),
    __metadata("design:type", String)
], DrafterDepartmentDto.prototype, "departmentName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '부서 코드',
        example: 'DEV',
    }),
    __metadata("design:type", String)
], DrafterDepartmentDto.prototype, "departmentCode", void 0);
class DrafterDto {
}
exports.DrafterDto = DrafterDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '기안자 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], DrafterDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '기안자 사번',
        example: 'EMP001',
    }),
    __metadata("design:type", String)
], DrafterDto.prototype, "employeeNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '기안자 이름',
        example: '홍길동',
    }),
    __metadata("design:type", String)
], DrafterDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '기안자 이메일',
        example: 'hong@example.com',
    }),
    __metadata("design:type", String)
], DrafterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '기안자 부서 정보',
        type: DrafterDepartmentDto,
    }),
    __metadata("design:type", DrafterDepartmentDto)
], DrafterDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '기안자 직책 정보',
        type: PositionDto,
    }),
    __metadata("design:type", PositionDto)
], DrafterDto.prototype, "position", void 0);
class ApprovalStepTemplatesDto {
}
exports.ApprovalStepTemplatesDto = ApprovalStepTemplatesDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '합의 단계 목록',
        type: [ApprovalStepTemplateWithApproversDto],
    }),
    __metadata("design:type", Array)
], ApprovalStepTemplatesDto.prototype, "agreements", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '결재 단계 목록',
        type: [ApprovalStepTemplateWithApproversDto],
    }),
    __metadata("design:type", Array)
], ApprovalStepTemplatesDto.prototype, "approvals", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '시행 단계 목록',
        type: [ApprovalStepTemplateWithApproversDto],
    }),
    __metadata("design:type", Array)
], ApprovalStepTemplatesDto.prototype, "implementations", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '참조 단계 목록',
        type: [ApprovalStepTemplateWithApproversDto],
    }),
    __metadata("design:type", Array)
], ApprovalStepTemplatesDto.prototype, "references", void 0);
class DocumentTemplateWithApproversResponseDto {
}
exports.DocumentTemplateWithApproversResponseDto = DocumentTemplateWithApproversResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '문서 템플릿 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], DocumentTemplateWithApproversResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '문서 템플릿 이름',
        example: '휴가 신청서',
    }),
    __metadata("design:type", String)
], DocumentTemplateWithApproversResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '문서 템플릿 코드',
        example: 'VAC',
    }),
    __metadata("design:type", String)
], DocumentTemplateWithApproversResponseDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '문서 템플릿 설명',
        example: '휴가 신청을 위한 양식',
    }),
    __metadata("design:type", String)
], DocumentTemplateWithApproversResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '문서 템플릿 상태',
        enum: approval_enum_1.DocumentTemplateStatus,
        example: approval_enum_1.DocumentTemplateStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], DocumentTemplateWithApproversResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'HTML 템플릿',
        example: '<html>...</html>',
    }),
    __metadata("design:type", String)
], DocumentTemplateWithApproversResponseDto.prototype, "template", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '카테고리 ID',
        example: 'uuid',
    }),
    __metadata("design:type", String)
], DocumentTemplateWithApproversResponseDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '카테고리 정보',
        type: CategoryResponseDto,
    }),
    __metadata("design:type", CategoryResponseDto)
], DocumentTemplateWithApproversResponseDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '기안자 정보',
        type: DrafterDto,
    }),
    __metadata("design:type", DrafterDto)
], DocumentTemplateWithApproversResponseDto.prototype, "drafter", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '결재 단계 템플릿 (타입별 분류)',
        type: ApprovalStepTemplatesDto,
    }),
    __metadata("design:type", ApprovalStepTemplatesDto)
], DocumentTemplateWithApproversResponseDto.prototype, "approvalStepTemplates", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '생성일',
        example: '2025-11-11T00:00:00.000Z',
    }),
    __metadata("design:type", Date)
], DocumentTemplateWithApproversResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '수정일',
        example: '2025-11-11T00:00:00.000Z',
    }),
    __metadata("design:type", Date)
], DocumentTemplateWithApproversResponseDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=template-with-approvers-response.dto.js.map