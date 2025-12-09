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
exports.DocumentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../../../common/guards/jwt-auth.guard");
const document_service_1 = require("../services/document.service");
const dtos_1 = require("../dtos");
const approval_enum_1 = require("../../../../common/enums/approval.enum");
const comment_dto_1 = require("../dtos/comment.dto");
const user_decorator_1 = require("../../../../common/decorators/user.decorator");
const employee_entity_1 = require("../../../domain/employee/employee.entity");
let DocumentController = class DocumentController {
    constructor(documentService) {
        this.documentService = documentService;
    }
    async createDocument(user, dto) {
        return await this.documentService.createDocument(dto, user.id);
    }
    async getMyAllDocumentsStatistics(user) {
        return await this.documentService.getMyAllDocumentsStatistics(user.id);
    }
    async getMyAllDocuments(user, query) {
        return await this.documentService.getMyAllDocuments({
            userId: user.id,
            filterType: query.filterType,
            receivedStepType: query.receivedStepType,
            drafterFilter: query.drafterFilter,
            referenceReadStatus: query.referenceReadStatus,
            pendingStatusFilter: query.pendingStatusFilter,
            agreementStepStatus: query.agreementStepStatus,
            searchKeyword: query.searchKeyword,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
            sortOrder: query.sortOrder,
            page: query.page,
            limit: query.limit,
        });
    }
    async getMyDrafts(user, draftFilter, page, limit) {
        return await this.documentService.getMyDrafts(user.id, page || 1, limit || 20, draftFilter);
    }
    async getDocument(user, documentId) {
        return await this.documentService.getDocument(documentId, user.id);
    }
    async updateDocument(user, documentId, dto) {
        return await this.documentService.updateDocument(documentId, dto);
    }
    async deleteDocument(documentId) {
        await this.documentService.deleteDocument(documentId);
    }
    async submitDocument(documentId, dto) {
        return await this.documentService.submitDocument({
            documentId,
            ...dto,
        });
    }
    async cancelSubmit(user, documentId, dto) {
        return await this.documentService.cancelSubmit(documentId, user.id, dto.reason);
    }
    async submitDocumentDirect(user, dto) {
        return await this.documentService.submitDocumentDirect(dto, user.id);
    }
    async getTemplateForNewDocument(templateId, user) {
        return await this.documentService.getTemplateForNewDocument(templateId, user.id);
    }
    async getDocumentStatistics(userId) {
        return await this.documentService.getDocumentStatistics(userId);
    }
    async createComment(documentId, user, dto) {
        return await this.documentService.createComment(documentId, dto, user.id);
    }
    async getDocumentComments(documentId) {
        return await this.documentService.getDocumentComments(documentId);
    }
    async updateComment(commentId, user, dto) {
        return await this.documentService.updateComment(commentId, dto, user.id);
    }
    async deleteComment(commentId, user) {
        await this.documentService.deleteComment(commentId, user.id);
    }
    async getComment(commentId) {
        return await this.documentService.getComment(commentId);
    }
    async createTestDocument(query) {
        const getEmployeeId = (name) => dtos_1.TEST_EMPLOYEE_ID_MAP[name];
        const approvalSteps = [];
        let stepOrder = 1;
        if (query.agreement1Approver && query.agreement1Status) {
            approvalSteps.push({
                stepOrder: stepOrder++,
                stepType: approval_enum_1.ApprovalStepType.AGREEMENT,
                approverId: getEmployeeId(query.agreement1Approver),
                status: query.agreement1Status,
            });
        }
        if (query.agreement2Approver && query.agreement2Status) {
            approvalSteps.push({
                stepOrder: stepOrder++,
                stepType: approval_enum_1.ApprovalStepType.AGREEMENT,
                approverId: getEmployeeId(query.agreement2Approver),
                status: query.agreement2Status,
            });
        }
        approvalSteps.push({
            stepOrder: stepOrder++,
            stepType: approval_enum_1.ApprovalStepType.APPROVAL,
            approverId: getEmployeeId(query.approval1Approver),
            status: query.approval1Status,
        });
        if (query.approval2Approver && query.approval2Status) {
            approvalSteps.push({
                stepOrder: stepOrder++,
                stepType: approval_enum_1.ApprovalStepType.APPROVAL,
                approverId: getEmployeeId(query.approval2Approver),
                status: query.approval2Status,
            });
        }
        if (query.approval3Approver && query.approval3Status) {
            approvalSteps.push({
                stepOrder: stepOrder++,
                stepType: approval_enum_1.ApprovalStepType.APPROVAL,
                approverId: getEmployeeId(query.approval3Approver),
                status: query.approval3Status,
            });
        }
        approvalSteps.push({
            stepOrder: stepOrder++,
            stepType: approval_enum_1.ApprovalStepType.IMPLEMENTATION,
            approverId: getEmployeeId(query.implementationApprover),
            status: query.implementationStatus,
        });
        if (query.reference1Approver && query.reference1Status) {
            approvalSteps.push({
                stepOrder: stepOrder++,
                stepType: approval_enum_1.ApprovalStepType.REFERENCE,
                approverId: getEmployeeId(query.reference1Approver),
                status: query.reference1Status,
            });
        }
        if (query.reference2Approver && query.reference2Status) {
            approvalSteps.push({
                stepOrder: stepOrder++,
                stepType: approval_enum_1.ApprovalStepType.REFERENCE,
                approverId: getEmployeeId(query.reference2Approver),
                status: query.reference2Status,
            });
        }
        const dto = {
            title: query.title,
            content: query.content,
            drafterId: getEmployeeId(query.drafterName),
            status: query.status,
            approvalSteps,
        };
        return await this.documentService.createTestDocument(dto);
    }
};
exports.DocumentController = DocumentController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: '문서 생성 (임시저장)',
        description: '문서를 임시저장 상태로 생성합니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 문서 생성\n' +
            '- ❌ 실패: 필수 필드 누락 (drafterId)\n' +
            '- ❌ 실패: 존재하지 않는 documentTemplateId',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: '문서 생성 성공',
        type: dtos_1.DocumentResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '잘못된 요청',
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '인증 실패',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [employee_entity_1.Employee, dtos_1.CreateDocumentDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "createDocument", null);
__decorate([
    (0, common_1.Get)('my-all/statistics'),
    (0, swagger_1.ApiOperation)({
        summary: '내 전체 문서 통계 조회 (사이드바용)',
        description: '사이드바 표시를 위한 통계를 조회합니다.\n\n' +
            '**응답 형식:**\n' +
            '```json\n' +
            '{\n' +
            '  "DRAFT": 1,                  // 임시저장 (내가 임시 저장한 문서, DRAFT 상태)\n' +
            '  "PENDING": 10,               // 결재 진행중 (내가 상신한 문서, PENDING 상태)\n' +
            '  "RECEIVED": 15,              // 수신함 (내가 결재라인에 있지만 현재 내 차례가 아닌 문서)\n' +
            '  "PENDING_AGREEMENT": 1,      // 합의함 (현재 내가 협의해야 하는 문서)\n' +
            '  "PENDING_APPROVAL": 2,       // 결재함 (현재 내가 결재해야 하는 문서)\n' +
            '  "IMPLEMENTATION": 1,         // 시행함 (현재 내가 시행해야 하는 문서)\n' +
            '  "APPROVED": 20,              // 기결함 (내가 관련된 모든 결재 완료 문서, APPROVED/IMPLEMENTED)\n' +
            '  "REJECTED": 3,               // 반려함 (내가 관련된 모든 반려 문서, REJECTED)\n' +
            '  "RECEIVED_REFERENCE": 23     // 수신참조함 (내가 참조자로 있는 문서, IMPLEMENTED 상태만)\n' +
            '}\n' +
            '```\n\n' +
            '**필터별 상세 설명:**\n' +
            '- DRAFT: 내가 임시 저장한 문서 (문서 상태: DRAFT)\n' +
            '- PENDING: 내가 상신한 결재 진행중 문서 (문서 상태: PENDING)\n' +
            '- RECEIVED: 내가 결재라인에 있지만 현재 내 차례가 아닌 문서\n' +
            '  * 아직 내 차례가 아닌 것 (앞에 PENDING 단계 있음)\n' +
            '  * 이미 내가 처리한 것 (내 단계가 APPROVED)\n' +
            '- PENDING_AGREEMENT: 현재 내가 협의해야 하는 문서 (내 차례, 내 앞에 PENDING 없음)\n' +
            '- PENDING_APPROVAL: 현재 내가 결재해야 하는 문서 (내 차례, 내 앞에 PENDING 없음)\n' +
            '- IMPLEMENTATION: 현재 내가 시행해야 하는 문서 (시행 단계가 PENDING)\n' +
            '- APPROVED: 내가 기안했거나 결재라인에 속한 모든 결재 완료 문서 (APPROVED/IMPLEMENTED)\n' +
            '- REJECTED: 내가 기안했거나 결재라인에 속했지만 반려된 문서 (REJECTED)\n' +
            '- RECEIVED_REFERENCE: 내가 참조자로 있는 문서 (IMPLEMENTED 상태만)\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 문서 통계 조회\n' +
            '- ❌ 실패: 존재하지 않는 사용자 ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '내 전체 문서 통계 조회 성공',
        type: dtos_1.MyAllDocumentsStatisticsResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '인증 실패',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [employee_entity_1.Employee]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getMyAllDocumentsStatistics", null);
__decorate([
    (0, common_1.Get)('my-all/documents'),
    (0, swagger_1.ApiOperation)({
        summary: '내 전체 문서 목록 조회 (통계와 동일한 필터)',
        description: '통계 조회와 동일한 필터로 실제 문서 목록을 조회합니다.\n\n' +
            '**필터 타입 (filterType):**\n' +
            '- DRAFT: 임시저장 (내가 임시 저장한 문서, DRAFT 상태)\n' +
            '- PENDING: 상신함 (내가 상신한 문서, DRAFT 제외 모든 상태)\n' +
            '- RECEIVED: 수신함 (내가 결재라인에 있지만 현재 내 차례가 아닌 문서)\n' +
            '  * 아직 내 차례가 아닌 것 (앞에 PENDING 단계 있음)\n' +
            '  * 이미 내가 처리한 것 (내 단계가 APPROVED)\n' +
            '- PENDING_AGREEMENT: 합의함 (내가 합의자로 있는 문서)\n' +
            '- PENDING_APPROVAL: 결재함 (현재 내가 결재해야 하는 문서)\n' +
            '- IMPLEMENTATION: 시행함 (현재 내가 시행해야 하는 문서, 시행 단계가 PENDING)\n' +
            '- APPROVED: 기결함 (내가 관련된 모든 결재 완료 문서, APPROVED/IMPLEMENTED)\n' +
            '  * 내가 기안한 결재 완료 문서\n' +
            '  * 내가 결재라인에 속한 결재 완료 문서\n' +
            '- REJECTED: 반려함 (내가 관련된 모든 반려 문서, REJECTED)\n' +
            '  * 내가 기안한 반려 문서\n' +
            '  * 내가 결재라인에 속했지만 반려된 문서\n' +
            '- RECEIVED_REFERENCE: 수신참조함 (내가 참조자로 있는 문서, IMPLEMENTED 상태만)\n' +
            '- 미지정: 내가 기안한 문서 + 내가 참여하는 문서 전체\n\n' +
            '**상신함 문서 상태 필터 (pendingStatusFilter) - PENDING에만 적용:**\n' +
            '- PENDING: 결재 진행중인 문서만\n' +
            '- APPROVED: 결재 완료된 문서만\n' +
            '- REJECTED: 반려된 문서만\n' +
            '- CANCELLED: 취소된 문서만\n' +
            '- IMPLEMENTED: 시행 완료된 문서만\n' +
            '- 미지정: DRAFT를 제외한 모든 상태\n\n' +
            '**합의함 단계 상태 필터 (agreementStepStatus) - PENDING_AGREEMENT에만 적용:**\n' +
            '- SCHEDULED: 아직 내 차례가 아닌 상태\n' +
            '- PENDING: 내 차례인 상태 (현재 합의 대기)\n' +
            '- COMPLETED: 내 차례가 완료된 상태 (이미 합의 완료)\n' +
            '- 미지정: 모든 상태\n\n' +
            '**수신함 단계 타입 필터 (receivedStepType) - RECEIVED에만 적용:**\n' +
            '- AGREEMENT: 합의 단계로 수신한 문서만\n' +
            '- APPROVAL: 결재 단계로 수신한 문서만\n' +
            '- 미지정: 모든 수신 문서 (합의 + 결재)\n\n' +
            '**기안자 필터 (drafterFilter) - APPROVED, REJECTED에만 적용:**\n' +
            '- MY_DRAFT: 내가 기안한 문서만\n' +
            '- PARTICIPATED: 내가 참여한 문서만 (기안자가 아닌 경우)\n' +
            '- 미지정: 모든 문서 (기안 + 참여)\n\n' +
            '**열람 상태 필터 (referenceReadStatus) - RECEIVED_REFERENCE에만 적용:**\n' +
            '- READ: 열람한 문서\n' +
            '- UNREAD: 열람하지 않은 문서\n' +
            '- 미지정: 모든 참조 문서\n\n' +
            '**추가 필터링:**\n' +
            '- searchKeyword: 문서 제목 또는 템플릿 이름 검색\n' +
            '- startDate, endDate: 제출일 구분\n' +
            '- sortOrder: 정렬 순서 (LATEST: 최신순, OLDEST: 오래된순)\n' +
            '- page, limit: 페이징',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '내 전체 문서 목록 조회 성공',
        type: dtos_1.PaginatedDocumentsResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '인증 실패',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [employee_entity_1.Employee, dtos_1.QueryMyAllDocumentsDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getMyAllDocuments", null);
__decorate([
    (0, common_1.Get)('my-drafts'),
    (0, swagger_1.ApiOperation)({
        summary: '내가 작성한 문서 전체 조회',
        description: '내가 작성한 모든 문서를 조회합니다.\n\n' +
            '**주요 기능:**\n' +
            '- 내가 기안한 모든 문서 조회 (DRAFT, PENDING, APPROVED, REJECTED, IMPLEMENTED 모두 포함)\n' +
            '- 페이징 지원\n' +
            '- 생성일 기준 내림차순 정렬\n' +
            '- DRAFT 상태 필터링 지원\n\n' +
            '**draftFilter 옵션:**\n' +
            '- DRAFT_ONLY: 임시저장(DRAFT) 상태 문서만 조회\n' +
            '- EXCLUDE_DRAFT: 임시저장(DRAFT)을 제외한 문서만 조회 (상신된 문서)\n' +
            '- 미지정: 모든 상태의 문서 조회\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 내가 작성한 문서 전체 조회\n' +
            '- ✅ 정상: DRAFT_ONLY 필터링\n' +
            '- ✅ 정상: EXCLUDE_DRAFT 필터링\n' +
            '- ✅ 정상: 페이징 처리\n' +
            '- ❌ 실패: 존재하지 않는 사용자 ID',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'draftFilter',
        required: false,
        description: 'DRAFT 상태 필터 (DRAFT_ONLY: 임시저장만, EXCLUDE_DRAFT: 임시저장 제외)',
        enum: ['DRAFT_ONLY', 'EXCLUDE_DRAFT'],
        example: 'EXCLUDE_DRAFT',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        description: '페이지 번호 (1부터 시작)',
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        description: '페이지당 항목 수',
        example: 20,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '내가 작성한 문서 전체 조회 성공',
        type: dtos_1.PaginatedDocumentsResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '인증 실패',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Query)('draftFilter')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [employee_entity_1.Employee, String, Number, Number]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getMyDrafts", null);
__decorate([
    (0, common_1.Get)(':documentId'),
    (0, swagger_1.ApiOperation)({
        summary: '문서 상세 조회',
        description: '특정 문서의 상세 정보를 조회합니다.\n\n' +
            '**결재취소 가능 여부:**\n' +
            '- 각 결재 스텝에 `canCancelApproval` 필드가 포함됩니다.\n' +
            '- 조건: 문서가 결재진행중(PENDING)이고, 본인이 승인했으며, 다음 단계 수신자가 아직 미처리 상태일 때 true\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 문서 상세 조회\n' +
            '- ❌ 실패: 존재하지 않는 문서 ID',
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
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '인증 실패',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('documentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [employee_entity_1.Employee, String]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDocument", null);
__decorate([
    (0, common_1.Put)(':documentId'),
    (0, swagger_1.ApiOperation)({
        summary: '문서 수정',
        description: '문서를 수정합니다.\n\n' +
            '**정책:**\n' +
            '- 임시저장(DRAFT): 내용 + 결재선 수정 가능\n' +
            '- 결재진행중(PENDING): 내용만 수정 가능, 결재선 수정 불가\n' +
            '- 결재완료/반려/취소: 수정 불가\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 임시저장 문서 수정 성공\n' +
            '- ❌ 실패: 존재하지 않는 문서 ID\n' +
            '- ❌ 실패: 제출된 문서의 결재선 수정 시도',
    }),
    (0, swagger_1.ApiParam)({
        name: 'documentId',
        description: '문서 ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '문서 수정 성공',
        type: dtos_1.DocumentResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '문서를 찾을 수 없음',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '잘못된 요청 (임시저장 상태가 아님)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '인증 실패',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('documentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [employee_entity_1.Employee, String, dtos_1.UpdateDocumentDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "updateDocument", null);
__decorate([
    (0, common_1.Delete)(':documentId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: '문서 삭제',
        description: '임시저장 상태의 문서를 삭제합니다.\n\n' +
            '**정책:**\n' +
            '- 임시저장(DRAFT) 상태의 문서만 삭제 가능\n' +
            '- 제출된 문서는 삭제 불가\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 임시저장 문서 삭제 성공\n' +
            '- ❌ 실패: 존재하지 않는 문서 삭제\n' +
            '- ❌ 실패: 제출된 문서 삭제 시도',
    }),
    (0, swagger_1.ApiParam)({
        name: 'documentId',
        description: '문서 ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: '문서 삭제 성공',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '문서를 찾을 수 없음',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '잘못된 요청 (임시저장 상태가 아님)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '인증 실패',
    }),
    __param(0, (0, common_1.Param)('documentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "deleteDocument", null);
__decorate([
    (0, common_1.Post)(':documentId/submit'),
    (0, swagger_1.ApiOperation)({
        summary: '문서 기안',
        description: '임시저장된 문서를 기안합니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 문서 기안\n' +
            '- ❌ 실패: 이미 제출된 문서 재제출',
    }),
    (0, swagger_1.ApiParam)({
        name: 'documentId',
        description: '기안할 문서 ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '문서 기안 성공',
        type: dtos_1.SubmitDocumentResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '문서를 찾을 수 없음',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '잘못된 요청 (임시저장 상태가 아님)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '인증 실패',
    }),
    __param(0, (0, common_1.Param)('documentId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dtos_1.SubmitDocumentBodyDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "submitDocument", null);
__decorate([
    (0, common_1.Post)(':documentId/cancel-submit'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: '상신취소 (기안자용)',
        description: '기안자가 상신한 문서를 취소합니다.\n\n' +
            '**정책:**\n' +
            '- 결재진행중(PENDING) 상태의 문서만 취소 가능\n' +
            '- 결재자가 아직 어떤 처리도 하지 않은 상태에서만 가능\n' +
            '- 취소 시 문서 상태가 CANCELLED로 변경됨\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 결재자 처리 전 상신취소\n' +
            '- ❌ 실패: 결재자가 처리한 후 상신취소 시도\n' +
            '- ❌ 실패: 기안자가 아닌 사용자의 상신취소 시도\n' +
            '- ❌ 실패: 취소 사유 누락',
    }),
    (0, swagger_1.ApiParam)({
        name: 'documentId',
        description: '상신취소할 문서 ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '상신 취소 성공',
        type: dtos_1.DocumentResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '잘못된 요청 (결재 진행 중인 문서만 취소 가능, 이미 처리된 결재 있음)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: '권한 없음 (기안자만 상신취소 가능)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '문서를 찾을 수 없음',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('documentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [employee_entity_1.Employee, String, dtos_1.CancelSubmitDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "cancelSubmit", null);
__decorate([
    (0, common_1.Post)('submit-direct'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: '바로 기안',
        description: '임시저장 단계를 건너뛰고 바로 기안합니다. 내부적으로 임시저장 후 기안하는 방식으로 처리됩니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 바로 기안\n' +
            '- ❌ 실패: 결재선 누락',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: '문서 기안 성공',
        type: dtos_1.SubmitDocumentResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '잘못된 요청',
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '인증 실패',
    }),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [employee_entity_1.Employee, dtos_1.SubmitDocumentDirectDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "submitDocumentDirect", null);
__decorate([
    (0, common_1.Get)('templates/:templateId'),
    (0, swagger_1.ApiOperation)({
        summary: '새 문서 작성용 템플릿 상세 조회',
        description: '새 문서 작성 시 사용할 템플릿의 상세 정보를 조회합니다. AssigneeRule을 기반으로 실제 적용될 결재자 정보가 맵핑되어 반환됩니다.\n\n' +
            '현재 로그인한 사용자를 기안자로 하여 결재자 정보를 맵핑합니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 템플릿 상세 조회\n' +
            '- ❌ 실패: 존재하지 않는 템플릿 ID\n' +
            '- ❌ 실패: 인증 토큰 없음 (401 반환)',
    }),
    (0, swagger_1.ApiParam)({
        name: 'templateId',
        description: '문서 템플릿 ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '템플릿 상세 조회 성공 (결재자 정보 맵핑 포함)',
        type: dtos_1.DocumentTemplateWithApproversResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '템플릿 또는 기안자를 찾을 수 없음',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '잘못된 요청 (기안자의 부서/직책 정보 없음)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '인증 실패',
    }),
    __param(0, (0, common_1.Param)('templateId')),
    __param(1, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, employee_entity_1.Employee]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getTemplateForNewDocument", null);
__decorate([
    (0, common_1.Get)('statistics/:userId'),
    (0, swagger_1.ApiOperation)({
        summary: '문서 통계 조회',
        description: '사용자의 문서 통계를 조회합니다.\n\n' +
            '**내가 기안한 문서 통계:**\n' +
            '- 상신: 제출된 전체 문서\n' +
            '- 협의: PENDING 상태 + 현재 AGREEMENT 단계\n' +
            '- 미결: PENDING 상태 + 현재 APPROVAL 단계\n' +
            '- 기결: APPROVED 상태\n' +
            '- 반려: REJECTED 상태\n' +
            '- 시행: IMPLEMENTED 상태\n' +
            '- 임시저장: DRAFT 상태\n\n' +
            '**다른 사람이 기안한 문서:**\n' +
            '- 참조: 내가 참조자(REFERENCE)로 있는 문서\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 문서 통계 조회\n' +
            '- ❌ 실패: 존재하지 않는 사용자 ID',
    }),
    (0, swagger_1.ApiParam)({
        name: 'userId',
        description: '사용자 ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '문서 통계 조회 성공',
        type: dtos_1.DocumentStatisticsResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '인증 실패',
    }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDocumentStatistics", null);
__decorate([
    (0, common_1.Post)(':documentId/comments'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: '문서에 코멘트 작성',
        description: '문서에 코멘트를 작성합니다. 대댓글 작성도 가능합니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 코멘트 작성\n' +
            '- ✅ 정상: 대댓글 작성 (parentCommentId 포함)\n' +
            '- ❌ 실패: 존재하지 않는 문서\n' +
            '- ❌ 실패: 존재하지 않는 부모 코멘트',
    }),
    (0, swagger_1.ApiParam)({
        name: 'documentId',
        description: '문서 ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: '코멘트 작성 성공',
        type: comment_dto_1.CommentResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '문서 또는 부모 코멘트를 찾을 수 없음',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '잘못된 요청',
    }),
    __param(0, (0, common_1.Param)('documentId')),
    __param(1, (0, user_decorator_1.User)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, employee_entity_1.Employee,
        comment_dto_1.CreateCommentDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "createComment", null);
__decorate([
    (0, common_1.Get)(':documentId/comments'),
    (0, swagger_1.ApiOperation)({
        summary: '문서의 코멘트 목록 조회',
        description: '문서의 모든 코멘트를 조회합니다. 대댓글도 함께 조회됩니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 코멘트 목록 조회\n' +
            '- ❌ 실패: 존재하지 않는 문서',
    }),
    (0, swagger_1.ApiParam)({
        name: 'documentId',
        description: '문서 ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '코멘트 목록 조회 성공',
        type: [comment_dto_1.CommentResponseDto],
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '문서를 찾을 수 없음',
    }),
    __param(0, (0, common_1.Param)('documentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDocumentComments", null);
__decorate([
    (0, common_1.Put)('comments/:commentId'),
    (0, swagger_1.ApiOperation)({
        summary: '코멘트 수정',
        description: '작성한 코멘트를 수정합니다. 본인의 코멘트만 수정할 수 있습니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 코멘트 수정\n' +
            '- ❌ 실패: 존재하지 않는 코멘트\n' +
            '- ❌ 실패: 다른 사람의 코멘트 수정',
    }),
    (0, swagger_1.ApiParam)({
        name: 'commentId',
        description: '코멘트 ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '코멘트 수정 성공',
        type: comment_dto_1.CommentResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '코멘트를 찾을 수 없음',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '본인의 코멘트가 아님',
    }),
    __param(0, (0, common_1.Param)('commentId')),
    __param(1, (0, user_decorator_1.User)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, employee_entity_1.Employee, comment_dto_1.UpdateCommentDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "updateComment", null);
__decorate([
    (0, common_1.Delete)('comments/:commentId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: '코멘트 삭제',
        description: '작성한 코멘트를 삭제합니다. 본인의 코멘트만 삭제할 수 있습니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 코멘트 삭제\n' +
            '- ❌ 실패: 존재하지 않는 코멘트\n' +
            '- ❌ 실패: 다른 사람의 코멘트 삭제',
    }),
    (0, swagger_1.ApiParam)({
        name: 'commentId',
        description: '코멘트 ID',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'authorId',
        required: true,
        description: '작성자 ID (본인 확인용)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: '코멘트 삭제 성공',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '코멘트를 찾을 수 없음',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '본인의 코멘트가 아님',
    }),
    __param(0, (0, common_1.Param)('commentId')),
    __param(1, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, employee_entity_1.Employee]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Get)('comments/:commentId'),
    (0, swagger_1.ApiOperation)({
        summary: '코멘트 상세 조회',
        description: '특정 코멘트의 상세 정보를 조회합니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 코멘트 상세 조회\n' +
            '- ❌ 실패: 존재하지 않는 코멘트',
    }),
    (0, swagger_1.ApiParam)({
        name: 'commentId',
        description: '코멘트 ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '코멘트 상세 조회 성공',
        type: comment_dto_1.CommentResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '코멘트를 찾을 수 없음',
    }),
    __param(0, (0, common_1.Param)('commentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getComment", null);
__decorate([
    (0, common_1.Get)('test/create'),
    (0, swagger_1.ApiOperation)({
        summary: '🧪 테스트 문서 생성',
        description: '개발/테스트 환경에서 다양한 상태의 문서를 빠르게 생성합니다.\n\n' +
            '**⚠️ 주의: 이 API는 테스트 목적으로만 사용해야 합니다.**\n\n' +
            '**결재 단계별 구분:**\n' +
            '- 🤝 **합의 (AGREEMENT)**: 합의1, 합의2 (선택)\n' +
            '- ✅ **결재 (APPROVAL)**: 결재1 (필수), 결재2 (선택)\n' +
            '- 🚀 **시행 (IMPLEMENTATION)**: 시행 (필수)\n' +
            '- 📋 **참조 (REFERENCE)**: 참조1, 참조2 (선택)\n\n' +
            '**사용 가능한 직원:**\n' +
            '김규현, 김종식, 우창욱, 이화영, 조민경, 박헌남, 유승훈, 민정호\n\n' +
            '**예시 시나리오:**\n' +
            '1. 결재 진행중: 결재1(APPROVED) + 시행(PENDING)\n' +
            '2. 완전 완료: 결재1(APPROVED) + 시행(APPROVED)\n' +
            '3. 합의 후 결재: 합의1(APPROVED) + 결재1(APPROVED) + 시행(PENDING)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '테스트 문서 생성 성공',
        type: dtos_1.CreateTestDocumentResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '잘못된 요청',
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '인증 실패',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateTestDocumentQueryDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "createTestDocument", null);
exports.DocumentController = DocumentController = __decorate([
    (0, swagger_1.ApiTags)('문서 관리'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('documents'),
    __metadata("design:paramtypes", [document_service_1.DocumentService])
], DocumentController);
//# sourceMappingURL=document.controller.js.map