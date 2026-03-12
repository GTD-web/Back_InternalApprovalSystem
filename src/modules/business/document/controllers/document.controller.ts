import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { DocumentService } from '../services/document.service';
import {
    CreateDocumentDto,
    UpdateDocumentDto,
    SubmitDocumentDto,
    SubmitDocumentBodyDto,
    SubmitDocumentDirectDto,
    DocumentResponseDto,
    SubmitDocumentResponseDto,
    ApprovalStepSnapshotResponseDto,
    QueryDocumentsDto,
    PaginatedDocumentsResponseDto,
    DocumentTemplateWithApproversResponseDto,
    DocumentStatisticsResponseDto,
    QueryMyAllDocumentsDto,
    MyAllDocumentsStatisticsResponseDto,
    CancelSubmitDto,
    CreateTestDocumentQueryDto,
    CreateTestDocumentDto,
    CreateTestDocumentResponseDto,
    TEST_EMPLOYEE_ID_MAP,
    TestEmployeeName,
} from '../dtos';
import { ApprovalStepType } from '../../../../common/enums/approval.enum';
import { CreateCommentDto, UpdateCommentDto, DeleteCommentDto, CommentResponseDto } from '../dtos/comment.dto';
import { DocumentStatus } from '../../../../common/enums/approval.enum';
import { User } from '../../../../common/decorators/user.decorator';
import { Employee } from '../../../domain/employee/employee.entity';
/**
 * 문서 관리 컨트롤러
 * 문서 CRUD 및 기안 관련 API를 제공합니다.
 */
@ApiTags('문서 관리')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentController {
    constructor(private readonly documentService: DocumentService) {}

    @Get('my-all/statistics')
    @ApiOperation({
        summary: '내 전체 문서 통계 조회 (사이드바용)',
        description:
            '사이드바 표시를 위한 결재함별 문서 개수를 조회합니다.\n\n' +
            '**응답 형식:**\n' +
            '```json\n' +
            '{\n' +
            '  "DRAFT": 1,                  // 임시저장함\n' +
            // '  "RECEIVED": 15,              // 수신함 (현재 미사용)\n' +
            '  "SUBMITTED": 10,             // 상신함 (나의 상신한 모든 문서, DRAFT 제외)\n' +
            '  "PENDING": 3,                // 미결함 (지금 내가 결재·협의해야 하는 문서)\n' +
            '  "APPROVED": 20,              // 기결함\n' +
            '  "REJECTED": 3,               // 반려함\n' +
            '  "IMPLEMENTATION": 1,         // 시행함\n' +
            '  "RECEIVED_REFERENCE": 23    // 수신참조함\n' +
            '}\n' +
            '```\n\n' +
            '**필터별 상세 설명:**\n' +
            '- DRAFT: 임시저장함 — 내가 임시 저장한 문서 (문서 상태: DRAFT)\n' +
            // '- RECEIVED: 수신함 — 아직 내 차례가 아닌 문서만 (내 앞에 PENDING 단계가 있는 문서, 결재진행중)\n' +
            '- SUBMITTED: 상신함 — 내가 상신한 모든 문서 (DRAFT 제외, 전체 상태)\n' +
            '- PENDING: 미결함 — 결재 진행 중이며, 내가 합의·결재 단계에서 대기 중이고 앞선 단계가 모두 승인된 문서\n' +
            '- IMPLEMENTATION: 시행함 — 문서 승인완료(APPROVED)이며, 내 시행 단계가 대기 중인 문서\n' +
            '- APPROVED: 기결함 — 내가 기안한 문서 중 승인완료·시행완료 + 내가 합의·결재에 승인한 문서(결재진행중/승인완료/시행완료)\n' +
            '- REJECTED: 반려함 — 내가 합의·결재자로 참여한 문서 중 반려(REJECTED)된 문서\n' +
            '- RECEIVED_REFERENCE: 수신참조함 — 내가 수신참조자로 지정된 문서 (문서 상태 무관)\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 문서 통계 조회\n' +
            '- ❌ 실패: 존재하지 않는 사용자 ID',
    })
    @ApiResponse({
        status: 200,
        description: '내 전체 문서 통계 조회 성공',
        type: MyAllDocumentsStatisticsResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async getMyAllDocumentsStatistics(@User() user: Employee) {
        return await this.documentService.getMyAllDocumentsStatistics(user.id);
    }

    @Get('my-all/documents')
    @ApiOperation({
        summary: '내 전체 문서 목록 조회 (통계와 동일한 필터)',
        description:
            '통계 조회와 동일한 필터로 결재함별 문서 목록을 조회합니다.\n\n' +
            '**필터 타입 (filterType):**\n' +
            '- DRAFT: 임시저장함 — 내가 임시 저장한 문서 (DRAFT)\n' +
            // '- RECEIVED: 수신함 — 아직 내 차례가 아닌 문서만 (내 앞에 PENDING 단계가 있는 문서)\n' +
            '- SUBMITTED: 상신함 — 내가 상신한 모든 문서 (DRAFT 제외)\n' +
            '- PENDING: 미결함 — 지금 내가 결재·협의해야 하는 문서 (합의·결재 대기, 앞선 단계 모두 승인)\n' +
            '- IMPLEMENTATION: 시행함 — 문서 승인완료이며 내 시행 단계가 대기 중인 문서\n' +
            '- APPROVED: 기결함 — 내가 기안한 문서 중 승인·시행 완료 + 내가 합의·결재에 승인한 문서 (drafterFilter 옵션 사용)\n' +
            '- REJECTED: 반려함 — 내가 합의·결재자로 있는 문서 중 반려된 문서\n' +
            '- RECEIVED_REFERENCE: 수신참조함 — 내가 수신참조자로 지정된 문서 (문서 상태 무관)\n' +
            '- 미지정: 내가 기안한 문서 + 내가 참여하는 문서 전체\n\n' +
            '**상신함 문서 상태 필터 (pendingStatusFilter) - SUBMITTED에만 적용:**\n' +
            '- PENDING, APPROVED, REJECTED, CANCELLED, IMPLEMENTED: 해당 상태만\n' +
            '- 미지정: DRAFT 제외 전체\n\n' +
            '**기안자 필터 (drafterFilter) - APPROVED에만 적용:**\n' +
            '- MY_DRAFT: 내가 기안한 문서만 (승인·시행 완료)\n' +
            '- PARTICIPATED: 내가 참여(합의·결재 승인)한 문서만\n' +
            '- 미지정: 기안 + 참여 모두\n\n' +
            '**열람 상태 필터 (referenceReadStatus) - RECEIVED_REFERENCE에만 적용:**\n' +
            '- READ / UNREAD / 미지정\n\n' +
            '**추가 필터링:** searchKeyword, startDate, endDate, sortOrder, page, limit',
    })
    @ApiResponse({
        status: 200,
        description: '내 전체 문서 목록 조회 성공',
        type: PaginatedDocumentsResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async getMyAllDocuments(@User() user: Employee, @Query() query: QueryMyAllDocumentsDto) {
        return await this.documentService.getMyAllDocuments({
            userId: user.id,
            filterType: query.filterType,
            // receivedStepType: query.receivedStepType,
            drafterFilter: query.drafterFilter,
            referenceReadStatus: query.referenceReadStatus,
            pendingStatusFilter: query.pendingStatusFilter,
            searchKeyword: query.searchKeyword,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
            sortOrder: query.sortOrder,
            page: query.page,
            limit: query.limit,
        });
    }

    @Get('my-drafts')
    @ApiOperation({
        summary: '내가 작성한 문서 전체 조회',
        description:
            '내가 작성한 모든 문서를 조회합니다.\n\n' +
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
    })
    @ApiQuery({
        name: 'draftFilter',
        required: false,
        description: 'DRAFT 상태 필터 (DRAFT_ONLY: 임시저장만, EXCLUDE_DRAFT: 임시저장 제외)',
        enum: ['DRAFT_ONLY', 'EXCLUDE_DRAFT'],
        example: 'EXCLUDE_DRAFT',
    })
    @ApiQuery({
        name: 'page',
        required: false,
        description: '페이지 번호 (1부터 시작)',
        example: 1,
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: '페이지당 항목 수',
        example: 20,
    })
    @ApiResponse({
        status: 200,
        description: '내가 작성한 문서 전체 조회 성공',
        type: PaginatedDocumentsResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async getMyDrafts(
        @User() user: Employee,
        @Query('draftFilter') draftFilter?: 'DRAFT_ONLY' | 'EXCLUDE_DRAFT',
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return await this.documentService.getMyDrafts(user.id, page || 1, limit || 20, draftFilter);
    }

    @Get('statistics/:userId')
    @ApiOperation({
        summary: '문서 통계 조회',
        description:
            '사용자의 문서 통계를 조회합니다.\n\n' +
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
    })
    @ApiParam({
        name: 'userId',
        description: '사용자 ID',
    })
    @ApiResponse({
        status: 200,
        description: '문서 통계 조회 성공',
        type: DocumentStatisticsResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async getDocumentStatistics(@Param('userId') userId: string) {
        return await this.documentService.getDocumentStatistics(userId);
    }

    @Get('templates/:templateId')
    @ApiOperation({
        summary: '새 문서 작성용 템플릿 상세 조회',
        description:
            '새 문서 작성 시 사용할 템플릿의 상세 정보를 조회합니다. AssigneeRule을 기반으로 실제 적용될 결재자 정보가 맵핑되어 반환됩니다.\n\n' +
            '현재 로그인한 사용자를 기안자로 하여 결재자 정보를 맵핑합니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 템플릿 상세 조회\n' +
            '- ❌ 실패: 존재하지 않는 템플릿 ID\n' +
            '- ❌ 실패: 인증 토큰 없음 (401 반환)',
    })
    @ApiParam({
        name: 'templateId',
        description: '문서 템플릿 ID',
    })
    @ApiResponse({
        status: 200,
        description: '템플릿 상세 조회 성공 (결재자 정보 맵핑 포함)',
        type: DocumentTemplateWithApproversResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: '템플릿 또는 기안자를 찾을 수 없음',
    })
    @ApiResponse({
        status: 400,
        description: '잘못된 요청 (기안자의 부서/직책 정보 없음)',
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async getTemplateForNewDocument(@Param('templateId') templateId: string, @User() user: Employee) {
        return await this.documentService.getTemplateForNewDocument(templateId, user.id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: '문서 생성 (임시저장)',
        description:
            '문서를 임시저장 상태로 생성합니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 문서 생성\n' +
            '- ❌ 실패: 필수 필드 누락 (drafterId)\n' +
            '- ❌ 실패: 존재하지 않는 documentTemplateId',
    })
    @ApiResponse({
        status: 201,
        description: '문서 생성 성공',
        type: DocumentResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: '잘못된 요청',
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async createDocument(@User() user: Employee, @Body() dto: CreateDocumentDto) {
        return await this.documentService.createDocument(dto, user.id);
    }

    @Post(':documentId/submit')
    @ApiOperation({
        summary: '문서 기안',
        description:
            '임시저장된 문서를 기안합니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 문서 기안\n' +
            '- ❌ 실패: 이미 제출된 문서 재제출',
    })
    @ApiParam({
        name: 'documentId',
        description: '기안할 문서 ID',
    })
    @ApiResponse({
        status: 200,
        description: '문서 기안 성공',
        type: SubmitDocumentResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: '문서를 찾을 수 없음',
    })
    @ApiResponse({
        status: 400,
        description: '잘못된 요청 (임시저장 상태가 아님)',
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async submitDocument(@Param('documentId') documentId: string, @Body() dto: SubmitDocumentBodyDto) {
        return await this.documentService.submitDocument({
            documentId,
            ...dto,
        });
    }

    @Post('submit-direct')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: '바로 기안',
        description:
            '임시저장 단계를 건너뛰고 바로 기안합니다. 내부적으로 임시저장 후 기안하는 방식으로 처리됩니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 바로 기안\n' +
            '- ❌ 실패: 결재선 누락',
    })
    @ApiResponse({
        status: 201,
        description: '문서 기안 성공',
        type: SubmitDocumentResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: '잘못된 요청',
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async submitDocumentDirect(@User() user: Employee, @Body() dto: SubmitDocumentDirectDto) {
        return await this.documentService.submitDocumentDirect(dto, user.id);
    }

    @Post('submit-direct-per-consulter')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: '합의자별 바로 기안',
        description:
            '바로 기안과 동일한 요청 Body를 사용합니다. 결재선(approvalSteps)에서 합의(AGREEMENT) 단계를 분리하여, 합의자 수만큼 문서를 각각 상신합니다.\n\n' +
            '**예시:** 결재1-합의2-합의3-합의4-결재5 → (결재1-합의2-결재5), (결재1-합의3-결재5), (결재1-합의4-결재5) 3건 상신\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 합의 단계가 있으면 해당 수만큼 문서 상신\n' +
            '- ✅ approvalSteps 없거나 합의 단계 없으면 단일 문서로 바로 기안과 동일 처리',
    })
    @ApiResponse({
        status: 201,
        description: '문서 기안 성공 (상신된 문서 배열)',
        type: [SubmitDocumentResponseDto],
    })
    @ApiResponse({
        status: 400,
        description: '잘못된 요청',
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async submitDocumentDirectPerConsulter(@User() user: Employee, @Body() dto: SubmitDocumentDirectDto) {
        return await this.documentService.submitDocumentDirectPerConsulter(dto, user.id);
    }

    @Get(':documentId')
    @ApiOperation({
        summary: '문서 상세 조회',
        description:
            '특정 문서의 상세 정보를 조회합니다. 로그인 사용자로 조회 시 응답에 `actionButtons`가 포함됩니다.\n\n' +
            '**actionButtons:** 스탭(또는 문서) 단위 배열. 각 항목: { id: step.id 또는 "document", buttons: ["MODIFY", "STEP_PENDING"] 등 }\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 문서 상세 조회\n' +
            '- ❌ 실패: 존재하지 않는 문서 ID',
    })
    @ApiParam({
        name: 'documentId',
        description: '문서 ID',
    })
    @ApiResponse({
        status: 200,
        description: '문서 상세 조회 성공',
        type: DocumentResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: '문서를 찾을 수 없음',
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async getDocument(@User() user: Employee, @Param('documentId') documentId: string) {
        return await this.documentService.getDocument(documentId, user.id);
    }

    @Put(':documentId')
    @ApiOperation({
        summary: '문서 수정',
        description:
            '문서를 수정합니다.\n\n' +
            '**정책:**\n' +
            '- 임시저장(DRAFT): 내용 + 결재선 수정 가능\n' +
            '- 결재진행중(PENDING): 내용만 수정 가능, 결재선 수정 불가\n' +
            '- 결재완료/반려/취소: 수정 불가\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 임시저장 문서 수정 성공\n' +
            '- ❌ 실패: 존재하지 않는 문서 ID\n' +
            '- ❌ 실패: 제출된 문서의 결재선 수정 시도',
    })
    @ApiParam({
        name: 'documentId',
        description: '문서 ID',
    })
    @ApiResponse({
        status: 200,
        description: '문서 수정 성공',
        type: DocumentResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: '문서를 찾을 수 없음',
    })
    @ApiResponse({
        status: 400,
        description: '잘못된 요청 (임시저장 상태가 아님)',
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async updateDocument(
        @User() user: Employee,
        @Param('documentId') documentId: string,
        @Body() dto: UpdateDocumentDto,
    ) {
        return await this.documentService.updateDocument(documentId, dto);
    }

    @Delete(':documentId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: '문서 삭제',
        description:
            '임시저장 상태의 문서를 삭제합니다.\n\n' +
            '**정책:**\n' +
            '- 임시저장(DRAFT) 상태의 문서만 삭제 가능\n' +
            '- 제출된 문서는 삭제 불가\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 임시저장 문서 삭제 성공\n' +
            '- ❌ 실패: 존재하지 않는 문서 삭제\n' +
            '- ❌ 실패: 제출된 문서 삭제 시도',
    })
    @ApiParam({
        name: 'documentId',
        description: '문서 ID',
    })
    @ApiResponse({
        status: 204,
        description: '문서 삭제 성공',
    })
    @ApiResponse({
        status: 404,
        description: '문서를 찾을 수 없음',
    })
    @ApiResponse({
        status: 400,
        description: '잘못된 요청 (임시저장 상태가 아님)',
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async deleteDocument(@Param('documentId') documentId: string) {
        await this.documentService.deleteDocument(documentId);
    }

    // ==================== 코멘트 관련 API ====================

    @Post(':documentId/comments')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: '문서에 코멘트 작성',
        description:
            '문서에 코멘트를 작성합니다. 대댓글 작성도 가능합니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 코멘트 작성\n' +
            '- ✅ 정상: 대댓글 작성 (parentCommentId 포함)\n' +
            '- ❌ 실패: 존재하지 않는 문서\n' +
            '- ❌ 실패: 존재하지 않는 부모 코멘트',
    })
    @ApiParam({
        name: 'documentId',
        description: '문서 ID',
    })
    @ApiResponse({
        status: 201,
        description: '코멘트 작성 성공',
        type: CommentResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: '문서 또는 부모 코멘트를 찾을 수 없음',
    })
    @ApiResponse({
        status: 400,
        description: '잘못된 요청',
    })
    async createComment(
        @Param('documentId') documentId: string,
        @User() user: Employee,
        @Body() dto: CreateCommentDto,
    ) {
        return await this.documentService.createComment(documentId, dto, user.id);
    }

    @Get(':documentId/comments')
    @ApiOperation({
        summary: '문서의 코멘트 목록 조회',
        description:
            '문서의 모든 코멘트를 조회합니다. 대댓글도 함께 조회됩니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 코멘트 목록 조회\n' +
            '- ❌ 실패: 존재하지 않는 문서',
    })
    @ApiParam({
        name: 'documentId',
        description: '문서 ID',
    })
    @ApiResponse({
        status: 200,
        description: '코멘트 목록 조회 성공',
        type: [CommentResponseDto],
    })
    @ApiResponse({
        status: 404,
        description: '문서를 찾을 수 없음',
    })
    async getDocumentComments(@Param('documentId') documentId: string) {
        return await this.documentService.getDocumentComments(documentId);
    }

    @Put('comments/:commentId')
    @ApiOperation({
        summary: '코멘트 수정',
        description:
            '작성한 코멘트를 수정합니다. 본인의 코멘트만 수정할 수 있습니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 코멘트 수정\n' +
            '- ❌ 실패: 존재하지 않는 코멘트\n' +
            '- ❌ 실패: 다른 사람의 코멘트 수정',
    })
    @ApiParam({
        name: 'commentId',
        description: '코멘트 ID',
    })
    @ApiResponse({
        status: 200,
        description: '코멘트 수정 성공',
        type: CommentResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: '코멘트를 찾을 수 없음',
    })
    @ApiResponse({
        status: 400,
        description: '본인의 코멘트가 아님',
    })
    async updateComment(@Param('commentId') commentId: string, @User() user: Employee, @Body() dto: UpdateCommentDto) {
        return await this.documentService.updateComment(commentId, dto, user.id);
    }

    @Delete('comments/:commentId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: '코멘트 삭제',
        description:
            '작성한 코멘트를 삭제합니다. 본인의 코멘트만 삭제할 수 있습니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 코멘트 삭제\n' +
            '- ❌ 실패: 존재하지 않는 코멘트\n' +
            '- ❌ 실패: 다른 사람의 코멘트 삭제',
    })
    @ApiParam({
        name: 'commentId',
        description: '코멘트 ID',
    })
    @ApiQuery({
        name: 'authorId',
        required: true,
        description: '작성자 ID (본인 확인용)',
    })
    @ApiResponse({
        status: 204,
        description: '코멘트 삭제 성공',
    })
    @ApiResponse({
        status: 404,
        description: '코멘트를 찾을 수 없음',
    })
    @ApiResponse({
        status: 400,
        description: '본인의 코멘트가 아님',
    })
    async deleteComment(@Param('commentId') commentId: string, @User() user: Employee) {
        await this.documentService.deleteComment(commentId, user.id);
    }

    @Get('comments/:commentId')
    @ApiOperation({
        summary: '코멘트 상세 조회',
        description:
            '특정 코멘트의 상세 정보를 조회합니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 코멘트 상세 조회\n' +
            '- ❌ 실패: 존재하지 않는 코멘트',
    })
    @ApiParam({
        name: 'commentId',
        description: '코멘트 ID',
    })
    @ApiResponse({
        status: 200,
        description: '코멘트 상세 조회 성공',
        type: CommentResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: '코멘트를 찾을 수 없음',
    })
    async getComment(@Param('commentId') commentId: string) {
        return await this.documentService.getComment(commentId);
    }

    // ==================== 테스트 데이터 생성 API ====================

    @Delete('test/all')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '🧪 전체 데이터 삭제 및 초기화 (개발용)',
        description:
            '⚠️ **주의: 모든 문서, 템플릿, 카테고리 데이터가 삭제됩니다!**\n\n' +
            '개발/테스트 환경에서 데이터를 초기화할 때 사용합니다.\n\n' +
            '**삭제되는 데이터:**\n' +
            '- 모든 결재 단계 스냅샷 (approval_step_snapshots)\n' +
            '- 모든 코멘트 (comments)\n' +
            '- 모든 문서 리비전 (document_revisions)\n' +
            '- 모든 문서 (documents)\n' +
            '- 모든 결재 단계 템플릿 (approval_step_templates)\n' +
            '- 모든 문서 템플릿 (document_templates)\n' +
            '- 모든 카테고리 (categories)\n\n' +
            '**생성되는 기본 카테고리:**\n' +
            '- 기안문서 (DRAFT)\n' +
            '- 지출결의서 (EXPENSE)\n' +
            '- 신청서 (APPLICATION)\n' +
            '- 보고서 (REPORT)\n' +
            '- 공문 (OFFICIAL)\n' +
            '- 인사문서 (HR)\n' +
            '- 회계 (ACCOUNTING)\n\n' +
            '**⚠️ 이 작업은 되돌릴 수 없습니다!**',
    })
    @ApiResponse({
        status: 200,
        description: '전체 데이터 삭제 및 초기화 성공',
        schema: {
            type: 'object',
            properties: {
                deletedApprovalStepSnapshots: { type: 'number', description: '삭제된 결재 단계 스냅샷 수' },
                deletedComments: { type: 'number', description: '삭제된 코멘트 수' },
                deletedDocumentRevisions: { type: 'number', description: '삭제된 문서 리비전 수' },
                deletedDocuments: { type: 'number', description: '삭제된 문서 수' },
                deletedApprovalStepTemplates: { type: 'number', description: '삭제된 결재 단계 템플릿 수' },
                deletedDocumentTemplates: { type: 'number', description: '삭제된 문서 템플릿 수' },
                deletedCategories: { type: 'number', description: '삭제된 카테고리 수' },
                createdCategories: { type: 'number', description: '생성된 기본 카테고리 수' },
                categories: {
                    type: 'array',
                    description: '생성된 카테고리 목록',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: '카테고리 이름' },
                            code: { type: 'string', description: '카테고리 코드' },
                        },
                    },
                },
                message: { type: 'string', description: '결과 메시지' },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async deleteAllDocuments() {
        return await this.documentService.deleteAllDocuments();
    }

    @Get('test/create')
    @ApiOperation({
        summary: '🧪 테스트 문서 생성',
        description:
            '개발/테스트 환경에서 다양한 상태의 문서를 빠르게 생성합니다.\n\n' +
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
    })
    @ApiResponse({
        status: 200,
        description: '테스트 문서 생성 성공',
        type: CreateTestDocumentResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: '잘못된 요청',
    })
    @ApiResponse({
        status: 401,
        description: '인증 실패',
    })
    async createTestDocument(@Query() query: CreateTestDocumentQueryDto) {
        // 이름 -> ID 변환 헬퍼 함수
        const getEmployeeId = (name: TestEmployeeName): string => TEST_EMPLOYEE_ID_MAP[name];

        // Query 파라미터를 내부 DTO로 변환
        const approvalSteps: CreateTestDocumentDto['approvalSteps'] = [];
        let stepOrder = 1;

        // 1. 합의 단계 추가 (AGREEMENT)
        if (query.agreement1Approver && query.agreement1Status) {
            approvalSteps.push({
                stepOrder: stepOrder++,
                stepType: ApprovalStepType.AGREEMENT,
                approverId: getEmployeeId(query.agreement1Approver),
                status: query.agreement1Status,
            });
        }
        if (query.agreement2Approver && query.agreement2Status) {
            approvalSteps.push({
                stepOrder: stepOrder++,
                stepType: ApprovalStepType.AGREEMENT,
                approverId: getEmployeeId(query.agreement2Approver),
                status: query.agreement2Status,
            });
        }

        // 2. 결재 단계 추가 (APPROVAL) - 필수
        approvalSteps.push({
            stepOrder: stepOrder++,
            stepType: ApprovalStepType.APPROVAL,
            approverId: getEmployeeId(query.approval1Approver),
            status: query.approval1Status,
        });
        if (query.approval2Approver && query.approval2Status) {
            approvalSteps.push({
                stepOrder: stepOrder++,
                stepType: ApprovalStepType.APPROVAL,
                approverId: getEmployeeId(query.approval2Approver),
                status: query.approval2Status,
            });
        }
        if (query.approval3Approver && query.approval3Status) {
            approvalSteps.push({
                stepOrder: stepOrder++,
                stepType: ApprovalStepType.APPROVAL,
                approverId: getEmployeeId(query.approval3Approver),
                status: query.approval3Status,
            });
        }

        // 3. 시행 단계 추가 (IMPLEMENTATION) - 필수
        approvalSteps.push({
            stepOrder: stepOrder++,
            stepType: ApprovalStepType.IMPLEMENTATION,
            approverId: getEmployeeId(query.implementationApprover),
            status: query.implementationStatus,
        });

        // 4. 참조 단계 추가 (REFERENCE)
        if (query.reference1Approver && query.reference1Status) {
            approvalSteps.push({
                stepOrder: stepOrder++,
                stepType: ApprovalStepType.REFERENCE,
                approverId: getEmployeeId(query.reference1Approver),
                status: query.reference1Status,
            });
        }
        if (query.reference2Approver && query.reference2Status) {
            approvalSteps.push({
                stepOrder: stepOrder++,
                stepType: ApprovalStepType.REFERENCE,
                approverId: getEmployeeId(query.reference2Approver),
                status: query.reference2Status,
            });
        }

        const dto: CreateTestDocumentDto = {
            title: query.title,
            content: query.content,
            drafterId: getEmployeeId(query.drafterName),
            status: query.status,
            approvalSteps,
        };

        return await this.documentService.createTestDocument(dto);
    }
}
