import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ApprovalProcessService } from '../services/approval-process.service';
import {
    ApproveStepDto,
    RejectStepDto,
    CompleteAgreementDto,
    CompleteImplementationDto,
    CancelApprovalDto,
    CancelApprovalStepDto,
    MarkReferenceReadDto,
    ProcessApprovalActionDto,
    ApprovalActionResponseDto,
    PendingApprovalItemDto,
    DocumentApprovalStepsResponseDto,
    CancelApprovalResponseDto,
    QueryMyPendingDto,
    PaginatedPendingApprovalsResponseDto,
} from '../dtos';
import { Employee } from '../../../domain/employee/employee.entity';
import { User } from '../../../../common/decorators/user.decorator';

@ApiTags('결재 프로세스')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('approval-process')
export class ApprovalProcessController {
    constructor(private readonly approvalProcessService: ApprovalProcessService) {}

    /**
     * 협의 완료
     */
    @Post('complete-agreement')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '협의 완료',
        description: '협의 단계를 완료 처리합니다.\n\n' + '**테스트 시나리오:**\n' + '- ✅ 정상: 협의 완료',
    })
    @ApiResponse({ status: 200, description: '협의 완료 성공', type: ApprovalActionResponseDto })
    @ApiResponse({ status: 400, description: '잘못된 요청 (대기 중인 협의만 완료 가능)' })
    @ApiResponse({ status: 403, description: '권한 없음' })
    @ApiResponse({ status: 404, description: '협의 단계를 찾을 수 없음' })
    async completeAgreement(@User() user: Employee, @Body() dto: CompleteAgreementDto) {
        return await this.approvalProcessService.completeAgreement(dto, user.id);
    }

    /**
     * 결재 승인
     */
    @Post('approve')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '결재 승인',
        description:
            '결재 단계를 승인합니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 결재 승인 성공\n' +
            '- ❌ 실패: 권한 없는 사용자의 승인 시도\n' +
            '- ❌ 실패: 존재하지 않는 stepSnapshotId',
    })
    @ApiResponse({ status: 200, description: '결재 승인 성공', type: ApprovalActionResponseDto })
    @ApiResponse({ status: 400, description: '잘못된 요청 (대기 중인 결재만 승인 가능, 순서 검증 실패 등)' })
    @ApiResponse({ status: 403, description: '권한 없음' })
    @ApiResponse({ status: 404, description: '결재 단계를 찾을 수 없음' })
    async approveStep(@User() user: Employee, @Body() dto: ApproveStepDto) {
        return await this.approvalProcessService.approveStep(dto, user.id);
    }

    /**
     * 시행 완료
     */
    @Post('complete-implementation')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '시행 완료',
        description:
            '시행 단계를 완료 처리합니다. 모든 결재가 완료되어야 시행 가능합니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 시행 완료\n' +
            '- ❌ 실패: 결재 완료되지 않은 문서의 시행 시도',
    })
    @ApiResponse({ status: 200, description: '시행 완료 성공', type: ApprovalActionResponseDto })
    @ApiResponse({ status: 400, description: '잘못된 요청 (대기 중인 시행만 완료 가능, 모든 결재 미완료 등)' })
    @ApiResponse({ status: 403, description: '권한 없음' })
    @ApiResponse({ status: 404, description: '시행 단계를 찾을 수 없음' })
    async completeImplementation(@User() user: Employee, @Body() dto: CompleteImplementationDto) {
        return await this.approvalProcessService.completeImplementation(dto, user.id);
    }

    /**
     * 참조 열람 확인
     */
    @Post('mark-reference-read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '참조 문서 열람 확인',
        description:
            '참조 문서를 열람했음을 확인합니다. 참조자가 문서를 읽은 후 열람 완료 처리합니다.\n\n' +
            '**주요 기능:**\n' +
            '- 참조 단계를 APPROVED 상태로 변경 (열람 완료)\n' +
            '- 열람 의견 추가 가능 (선택)\n' +
            '- 이미 열람한 경우 중복 처리 허용\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 참조 문서 열람 확인\n' +
            '- ✅ 정상: 열람 의견 포함\n' +
            '- ✅ 정상: 이미 열람한 문서 재확인\n' +
            '- ❌ 실패: 참조자가 아닌 사용자의 열람 확인\n' +
            '- ❌ 실패: 참조 단계가 아닌 단계 처리',
    })
    @ApiResponse({ status: 200, description: '참조 열람 확인 성공', type: ApprovalActionResponseDto })
    @ApiResponse({ status: 400, description: '잘못된 요청 (참조 단계만 처리 가능)' })
    @ApiResponse({ status: 403, description: '권한 없음 (해당 참조자만 확인 가능)' })
    @ApiResponse({ status: 404, description: '참조 단계를 찾을 수 없음' })
    async markReferenceRead(@User() user: Employee, @Body() dto: MarkReferenceReadDto) {
        return await this.approvalProcessService.markReferenceRead(dto, user.id);
    }

    /**
     * 결재 반려
     */
    @Post('reject')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '결재 반려, 합의 반려',
        description:
            '결재 단계를 반려합니다. 반려 사유는 필수입니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 결재 반려 (사유 포함)\n' +
            '- ❌ 실패: 반려 사유 누락',
    })
    @ApiResponse({ status: 200, description: '결재 반려 성공', type: ApprovalActionResponseDto })
    @ApiResponse({ status: 400, description: '잘못된 요청 (대기 중인 결재만 반려 가능, 반려 사유 누락 등)' })
    @ApiResponse({ status: 403, description: '권한 없음' })
    @ApiResponse({ status: 404, description: '결재 단계를 찾을 수 없음' })
    async rejectStep(@User() user: Employee, @Body() dto: RejectStepDto) {
        return await this.approvalProcessService.rejectStep(dto, user.id);
    }

    /**
     * 결재취소 (결재자용)
     */
    @Post('cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '상신 취소 (결재자용)',
        description:
            '상신을 취소합니다.\n\n' +
            '**정책:**\n' +
            '- 본인이 상신된 문서만 취소 가능\n' +
            '- 취소 시 문서 상태를 CANCELLED로 변경\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 상신 취소',
    })
    @ApiResponse({ status: 200, description: '상신 취소 성공' })
    @ApiResponse({ status: 400, description: '잘못된 요청 (상신된 문서만 취소 가능)' })
    @ApiResponse({ status: 403, description: '권한 없음 (본인의 결재 단계만 취소 가능)' })
    @ApiResponse({ status: 404, description: '문서를 찾을 수 없음' })
    async cancelApprovalStep(@User() user: Employee, @Body() dto: CancelApprovalStepDto) {
        return await this.approvalProcessService.cancelApprovalStep(dto, user.id);
    }

    /**
     * @deprecated cancelSubmit과 cancelApprovalStep으로 분리됨
     */
    // @Post('cancel')
    // @HttpCode(HttpStatus.OK)
    // @ApiOperation({
    //     summary: '[Deprecated] 결재 취소 (상신취소/결재취소 통합)',
    //     description:
    //         '⚠️ 이 API는 더 이상 사용되지 않습니다. 대신 다음 API를 사용하세요:\n' +
    //         '- 상신취소: POST /approval-process/cancel-submit\n' +
    //         '- 결재취소: POST /approval-process/cancel-approval-step',
    //     deprecated: true,
    // })
    // @ApiResponse({ status: 200, description: '결재 취소 성공', type: CancelApprovalResponseDto })
    // @ApiResponse({ status: 400, description: '잘못된 요청' })
    // @ApiResponse({ status: 403, description: '권한 없음' })
    // @ApiResponse({ status: 404, description: '문서를 찾을 수 없음' })
    // async cancelApproval(@User() user: Employee, @Body() dto: CancelApprovalDto) {
    //     return await this.approvalProcessService.cancelApproval(dto, user.id);
    // }

    /**
     * 내 결재 대기 목록 조회 (페이징, 필터링)
     */
    // @Get('my-pending')
    // @ApiOperation({
    //     summary: '내 결재 대기 목록 조회 (탭별 필터링, 페이징)',
    //     description:
    //         '현재 사용자의 결재 대기 목록을 조회합니다. 탭별로 필터링 가능합니다.\n\n' +
    //         '**조회 타입:**\n' +
    //         '- **SUBMITTED** (상신): 내가 기안한 문서들 중 결재 대기 중인 문서\n' +
    //         '- **AGREEMENT** (합의): 내가 합의해야 하는 문서들\n' +
    //         '- **APPROVAL** (미결): 내가 결재해야 하는 문서들\n\n' +
    //         '**테스트 시나리오:**\n' +
    //         '- ✅ 정상: 상신 문서 목록 조회 (type=SUBMITTED)\n' +
    //         '- ✅ 정상: 합의 대기 목록 조회 (type=AGREEMENT)\n' +
    //         '- ✅ 정상: 결재 대기 목록 조회 (type=APPROVAL)\n' +
    //         '- ✅ 정상: 페이징 처리',
    // })
    // @ApiResponse({ status: 200, description: '조회 성공', type: PaginatedPendingApprovalsResponseDto })
    // async getMyPendingApprovals(@User() user: Employee, @Query() query: QueryMyPendingDto) {
    //     return await this.approvalProcessService.getMyPendingApprovals(
    //         user.id,
    //         query.type,
    //         query.page || 1,
    //         query.limit || 20,
    //     );
    // }

    /**
     * 문서의 결재 단계 목록 조회
     */
    @Get('document/:documentId/steps')
    @ApiOperation({
        summary: '문서의 결재 단계 목록 조회',
        description:
            '특정 문서의 모든 결재 단계 목록을 조회합니다.\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 문서의 결재 단계 목록 조회\n' +
            '- ❌ 실패: 존재하지 않는 문서 ID',
    })
    @ApiParam({
        name: 'documentId',
        description: '문서 ID',
        example: 'uuid',
    })
    @ApiResponse({ status: 200, description: '조회 성공', type: DocumentApprovalStepsResponseDto })
    @ApiResponse({ status: 404, description: '문서를 찾을 수 없음' })
    async getApprovalSteps(@Param('documentId') documentId: string) {
        return await this.approvalProcessService.getApprovalSteps(documentId);
    }

    /**
     * 통합 결재 액션 처리
     */
    @Post('process-action')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '통합 결재 액션 처리 (테스트용)',
        description:
            '승인, 반려, 협의 완료, 시행 완료, 참조 열람, 취소를 하나의 API로 처리합니다. type 값에 따라 적절한 액션이 수행됩니다.\n\n' +
            '**지원 액션 타입:**\n' +
            '- approve: 결재 승인\n' +
            '- reject: 결재 반려\n' +
            '- complete-agreement: 협의 완료\n' +
            '- complete-implementation: 시행 완료\n' +
            '- mark-reference-read: 참조 열람 확인\n' +
            '- cancel: 결재 취소\n\n' +
            '**테스트 시나리오:**\n' +
            '- ✅ 정상: 승인 액션 처리\n' +
            '- ✅ 정상: 반려 액션 처리\n' +
            '- ✅ 정상: 참조 열람 액션 처리\n' +
            '- ✅ 정상: 취소 액션 처리\n' +
            '- ❌ 실패: 잘못된 액션 타입\n' +
            '- ❌ 실패: 필수 필드 누락 (stepSnapshotId for approve)\n' +
            '- ❌ 실패: 필수 필드 누락 (comment for reject)',
    })
    @ApiResponse({ status: 200, description: '액션 처리 성공', type: ApprovalActionResponseDto })
    @ApiResponse({ status: 400, description: '잘못된 요청 (필수 필드 누락, 잘못된 타입 등)' })
    @ApiResponse({ status: 403, description: '권한 없음' })
    @ApiResponse({ status: 404, description: '결재 단계 또는 문서를 찾을 수 없음' })
    async processApprovalAction(@Body() dto: ProcessApprovalActionDto) {
        return await this.approvalProcessService.processApprovalAction(dto);
    }
}
