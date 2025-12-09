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
exports.QueryMyAllDocumentsDto = exports.SortOrder = exports.AgreementStepStatus = exports.PendingStatusFilter = exports.ReferenceReadStatus = exports.DrafterFilter = exports.ReceivedStepType = exports.MyAllDocumentFilterType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var MyAllDocumentFilterType;
(function (MyAllDocumentFilterType) {
    MyAllDocumentFilterType["DRAFT"] = "DRAFT";
    MyAllDocumentFilterType["RECEIVED"] = "RECEIVED";
    MyAllDocumentFilterType["PENDING"] = "PENDING";
    MyAllDocumentFilterType["PENDING_AGREEMENT"] = "PENDING_AGREEMENT";
    MyAllDocumentFilterType["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    MyAllDocumentFilterType["IMPLEMENTATION"] = "IMPLEMENTATION";
    MyAllDocumentFilterType["APPROVED"] = "APPROVED";
    MyAllDocumentFilterType["REJECTED"] = "REJECTED";
    MyAllDocumentFilterType["RECEIVED_REFERENCE"] = "RECEIVED_REFERENCE";
})(MyAllDocumentFilterType || (exports.MyAllDocumentFilterType = MyAllDocumentFilterType = {}));
var ReceivedStepType;
(function (ReceivedStepType) {
    ReceivedStepType["AGREEMENT"] = "AGREEMENT";
    ReceivedStepType["APPROVAL"] = "APPROVAL";
})(ReceivedStepType || (exports.ReceivedStepType = ReceivedStepType = {}));
var DrafterFilter;
(function (DrafterFilter) {
    DrafterFilter["MY_DRAFT"] = "MY_DRAFT";
    DrafterFilter["PARTICIPATED"] = "PARTICIPATED";
})(DrafterFilter || (exports.DrafterFilter = DrafterFilter = {}));
var ReferenceReadStatus;
(function (ReferenceReadStatus) {
    ReferenceReadStatus["READ"] = "READ";
    ReferenceReadStatus["UNREAD"] = "UNREAD";
})(ReferenceReadStatus || (exports.ReferenceReadStatus = ReferenceReadStatus = {}));
var PendingStatusFilter;
(function (PendingStatusFilter) {
    PendingStatusFilter["PENDING"] = "PENDING";
    PendingStatusFilter["APPROVED"] = "APPROVED";
    PendingStatusFilter["REJECTED"] = "REJECTED";
    PendingStatusFilter["CANCELLED"] = "CANCELLED";
    PendingStatusFilter["IMPLEMENTED"] = "IMPLEMENTED";
})(PendingStatusFilter || (exports.PendingStatusFilter = PendingStatusFilter = {}));
var AgreementStepStatus;
(function (AgreementStepStatus) {
    AgreementStepStatus["SCHEDULED"] = "SCHEDULED";
    AgreementStepStatus["PENDING"] = "PENDING";
    AgreementStepStatus["COMPLETED"] = "COMPLETED";
})(AgreementStepStatus || (exports.AgreementStepStatus = AgreementStepStatus = {}));
var SortOrder;
(function (SortOrder) {
    SortOrder["LATEST"] = "LATEST";
    SortOrder["OLDEST"] = "OLDEST";
})(SortOrder || (exports.SortOrder = SortOrder = {}));
class QueryMyAllDocumentsDto {
    constructor() {
        this.sortOrder = SortOrder.LATEST;
        this.page = 1;
        this.limit = 20;
    }
}
exports.QueryMyAllDocumentsDto = QueryMyAllDocumentsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '문서 필터 타입 (통계와 동일한 구분)\n' +
            '- DRAFT: 임시저장\n' +
            '- RECEIVED: 수신함 (내가 합의/결재 라인에 있는 받은 문서, 시행/참조 제외)\n' +
            '- PENDING: 상신함\n' +
            '- PENDING_AGREEMENT: 합의함\n' +
            '- PENDING_APPROVAL: 결재함\n' +
            '- IMPLEMENTATION: 시행함\n' +
            '- APPROVED: 기결함\n' +
            '- REJECTED: 반려함\n' +
            '- RECEIVED_REFERENCE: 수신참조함 (IMPLEMENTED 상태만)',
        enum: MyAllDocumentFilterType,
        example: MyAllDocumentFilterType.PENDING_APPROVAL,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(MyAllDocumentFilterType),
    __metadata("design:type", String)
], QueryMyAllDocumentsDto.prototype, "filterType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '수신함 단계 타입 필터 (RECEIVED에만 적용)\n' +
            '- AGREEMENT: 합의 단계로 수신한 문서만\n' +
            '- APPROVAL: 결재 단계로 수신한 문서만',
        enum: ReceivedStepType,
        example: ReceivedStepType.APPROVAL,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ReceivedStepType),
    __metadata("design:type", String)
], QueryMyAllDocumentsDto.prototype, "receivedStepType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '기안자 필터 (APPROVED, REJECTED에만 적용)\n' +
            '- MY_DRAFT: 내가 기안한 문서만\n' +
            '- PARTICIPATED: 내가 참여한 문서만 (기안자가 아닌 경우)',
        enum: DrafterFilter,
        example: DrafterFilter.MY_DRAFT,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(DrafterFilter),
    __metadata("design:type", String)
], QueryMyAllDocumentsDto.prototype, "drafterFilter", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '참조 문서 열람 여부 필터 (RECEIVED_REFERENCE에만 적용)\n' +
            '- READ: 열람함 (status = APPROVED)\n' +
            '- UNREAD: 미열람 (status = PENDING)',
        enum: ReferenceReadStatus,
        example: ReferenceReadStatus.UNREAD,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ReferenceReadStatus),
    __metadata("design:type", String)
], QueryMyAllDocumentsDto.prototype, "referenceReadStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '상신함 문서 상태 필터 (PENDING에만 적용)\n' +
            '- PENDING: 결재 진행중\n' +
            '- APPROVED: 결재 완료\n' +
            '- REJECTED: 반려됨\n' +
            '- CANCELLED: 취소됨\n' +
            '- IMPLEMENTED: 시행 완료\n' +
            '- 미지정: DRAFT를 제외한 모든 상태',
        enum: PendingStatusFilter,
        example: PendingStatusFilter.PENDING,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PendingStatusFilter),
    __metadata("design:type", String)
], QueryMyAllDocumentsDto.prototype, "pendingStatusFilter", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '합의함 단계 상태 필터 (PENDING_AGREEMENT에만 적용)\n' +
            '- SCHEDULED: 아직 내 차례가 아닌 상태\n' +
            '- PENDING: 내 차례인 상태 (현재 합의 대기)\n' +
            '- COMPLETED: 내 차례가 완료된 상태 (이미 합의 완료)\n' +
            '- 미지정: 모든 상태',
        enum: AgreementStepStatus,
        example: AgreementStepStatus.PENDING,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(AgreementStepStatus),
    __metadata("design:type", String)
], QueryMyAllDocumentsDto.prototype, "agreementStepStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '검색어 (문서 제목 또는 템플릿 이름)',
        example: '휴가',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryMyAllDocumentsDto.prototype, "searchKeyword", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '제출 시작 날짜 (YYYY-MM-DD)',
        example: '2025-01-01',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryMyAllDocumentsDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '제출 종료 날짜 (YYYY-MM-DD)',
        example: '2025-12-31',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryMyAllDocumentsDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '정렬 순서\n- LATEST: 최신순 (기본값)\n- OLDEST: 오래된순',
        enum: SortOrder,
        example: SortOrder.LATEST,
        default: SortOrder.LATEST,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(SortOrder),
    __metadata("design:type", String)
], QueryMyAllDocumentsDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '페이지 번호 (1부터 시작)',
        example: 1,
        default: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], QueryMyAllDocumentsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '페이지당 항목 수',
        example: 20,
        default: 20,
        minimum: 1,
        maximum: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], QueryMyAllDocumentsDto.prototype, "limit", void 0);
//# sourceMappingURL=query-my-all-documents.dto.js.map