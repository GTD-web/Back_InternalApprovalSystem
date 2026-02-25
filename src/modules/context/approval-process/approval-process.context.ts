import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { DomainApprovalStepSnapshotService } from '../../domain/approval-step-snapshot/approval-step-snapshot.service';
import { DomainDocumentService } from '../../domain/document/document.service';
import { DomainCommentService } from '../../domain/comment/comment.service';
import { Document } from '../../domain/document/document.entity';
import { ApprovalStepSnapshot } from '../../domain/approval-step-snapshot/approval-step-snapshot.entity';
import {
    ApproveStepDto,
    RejectStepDto,
    CompleteAgreementDto,
    CompleteImplementationDto,
    CancelApprovalDto,
    CancelApprovalStepDto,
    CancelApprovalStepResultDto,
    ApprovalStepFilterDto,
} from './dtos/approval-action.dto';
import { ApprovalStatus, ApprovalStepType, DocumentStatus } from '../../../common/enums/approval.enum';
import { withTransaction } from '../../../common/utils/transaction.util';
import { DocumentPolicyValidator, ReceiverAction } from '../../../common/utils/document-policy.validator';

/**
 * 결재 프로세스 컨텍스트
 *
 * 역할:
 * - 결재 승인/반려 처리
 * - 협의 완료 처리
 * - 시행 완료 처리
 * - 결재 취소 처리
 * - 결재 상태 조회
 * - 다음 결재자 자동 이동
 */
@Injectable()
export class ApprovalProcessContext {
    private readonly logger = new Logger(ApprovalProcessContext.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly approvalStepSnapshotService: DomainApprovalStepSnapshotService,
        private readonly documentService: DomainDocumentService,
        private readonly commentService: DomainCommentService,
    ) {}

    async testApproveStep(stepSnapshotId: string, queryRunner?: QueryRunner) {
        this.logger.log(`결재 승인 시작: ${stepSnapshotId}`);

        // 1) Step 조회
        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: stepSnapshotId },
        });

        // 6) 협의 완료 처리 (도메인 서비스 사용)
        step.승인한다(); // 협의도 APPROVED로 표시

        const savedStep = await this.approvalStepSnapshotService.save(step, { queryRunner });

        await this.checkAndUpdateDocumentStatus(savedStep.documentId, queryRunner);

        return savedStep;
    }

    /**
     * 3. 협의 완료 처리
     * 정책: 결재진행중 상태의 문서에서만 협의 가능
     * 협의는 순서에 상관없이 처리 가능하므로 문서 ID로 조회
     */
    async completeAgreement(dto: CompleteAgreementDto, queryRunner?: QueryRunner) {
        this.logger.log(`협의 완료 시작: documentId=${dto.documentId}, 협의자=${dto.agreerId}`);

        // 1) 해당 문서의 협의 단계 조회 (협의자는 순서에 상관없이 처리 가능)
        const step = await this.approvalStepSnapshotService.findOne({
            where: {
                documentId: dto.documentId,
                approverId: dto.agreerId,
                stepType: ApprovalStepType.AGREEMENT,
            },
            relations: ['approver', 'document'],
            queryRunner,
        });

        if (!step) {
            throw new NotFoundException('요청된 직원이 결재자로 있는 협의 단계를 찾을 수 없습니다.');
        }

        // 2) 정책 검증: 수신자 액션 가능 여부
        DocumentPolicyValidator.validateReceiverActionOrThrow(
            step.stepType,
            step.document.status,
            ReceiverAction.APPROVE,
        );

        // 3) 순서 확인: 앞선 순서의 모든 단계가 승인되었는지
        await this.validateApprovalOrder(step, queryRunner);

        // 4) 상태 확인
        if (step.status !== ApprovalStatus.PENDING) {
            throw new BadRequestException('대기 중인 협의만 완료할 수 있습니다.');
        }

        // 5) 협의 완료 처리 (도메인 서비스 사용)
        step.승인한다();

        const completedStep = await this.approvalStepSnapshotService.save(step, {
            queryRunner,
            relations: ['approver'],
        });

        // 6) 코멘트: 요청값이 있으면 해당 값, 없으면 기본값 저장
        const commentContent = (dto.comment?.trim() ?? '') || '협의 완료';
        await this.commentService.createComment(
            {
                documentId: step.documentId,
                authorId: dto.agreerId,
                content: commentContent,
            },
            queryRunner,
        );

        // 7) 모든 협의·결재 완료 시 문서 상태 결재완료로 갱신 (협의가 마지막 단계인 경우 포함)
        await this.checkAndUpdateDocumentStatus(step.documentId, queryRunner);

        this.logger.log(`협의 완료: documentId=${dto.documentId}, stepId=${completedStep.id}`);
        return completedStep;
    }

    /**
     * 협의 반려 처리
     * 정책: 결재진행중 상태의 문서에서만 협의 반려 가능
     * 협의는 순서에 상관없이 처리 가능하므로 문서 ID로 조회
     */
    async rejectAgreement(dto: { documentId: string; agreerId: string; comment: string }, queryRunner?: QueryRunner) {
        this.logger.log(`협의 반려 시작: documentId=${dto.documentId}, 협의자=${dto.agreerId}`);

        // 1) 해당 문서의 협의 단계 조회 (협의자는 순서에 상관없이 처리 가능)
        const step = await this.approvalStepSnapshotService.findOne({
            where: {
                documentId: dto.documentId,
                approverId: dto.agreerId,
                stepType: ApprovalStepType.AGREEMENT,
            },
            relations: ['approver', 'document'],
            queryRunner,
        });

        if (!step) {
            throw new NotFoundException('요청된 직원이 결재자로 있는 협의 단계를 찾을 수 없습니다.');
        }

        // 2) 정책 검증: 수신자 액션 가능 여부
        DocumentPolicyValidator.validateReceiverActionOrThrow(
            step.stepType,
            step.document.status,
            ReceiverAction.REJECT,
        );

        // 3) 단계 타입 확인
        if (step.stepType !== ApprovalStepType.AGREEMENT) {
            throw new BadRequestException('협의 단계만 반려할 수 있습니다.');
        }

        // 4) 상태 확인
        if (step.status !== ApprovalStatus.PENDING) {
            throw new BadRequestException('대기 중인 협의만 반려할 수 있습니다.');
        }

        // 5) 반려 사유 확인
        if (!dto.comment || dto.comment.trim().length === 0) {
            throw new BadRequestException('반려 사유를 입력해야 합니다.');
        }

        // 6) 협의 반려 처리 (도메인 서비스 사용)
        step.반려한다();

        const rejectedStep = await this.approvalStepSnapshotService.save(step, {
            queryRunner,
            relations: ['approver'],
        });

        // 7) 반려 사유를 Comment 엔티티로 생성
        await this.commentService.createComment(
            {
                documentId: step.documentId,
                authorId: dto.agreerId,
                content: dto.comment,
            },
            queryRunner,
        );

        // 8) Document 상태를 REJECTED로 변경
        const document = step.document;
        document.반려한다();

        await this.documentService.save(document, { queryRunner });

        this.logger.log(`협의 반려 완료: documentId=${dto.documentId}, stepId=${rejectedStep.id}`);
        return rejectedStep;
    }

    /**
     * 결재 승인 또는 협의 완료 (통합)
     * stepSnapshotId로 단계 조회 후 stepType에 따라 결재 승인 또는 협의 완료 처리
     */
    async approveStepOrCompleteAgreement(
        dto: { stepSnapshotId: string; userId: string; comment?: string },
        queryRunner?: QueryRunner,
    ) {
        this.logger.log(`승인/협의완료 시작: stepSnapshotId=${dto.stepSnapshotId}, userId=${dto.userId}`);

        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: dto.stepSnapshotId },
            relations: ['approver', 'document'],
            queryRunner,
        });

        DocumentPolicyValidator.validateReceiverActionOrThrow(
            step.stepType,
            step.document.status,
            ReceiverAction.APPROVE,
        );

        if (step.approverId !== dto.userId) {
            throw new ForbiddenException('해당 단계를 처리할 권한이 없습니다.');
        }
        if (step.status !== ApprovalStatus.PENDING) {
            throw new BadRequestException('대기 중인 단계만 승인/완료할 수 있습니다.');
        }
        if (step.stepType !== ApprovalStepType.APPROVAL && step.stepType !== ApprovalStepType.AGREEMENT) {
            throw new BadRequestException('결재 또는 협의 단계만 승인/완료할 수 있습니다.');
        }

        await this.validateApprovalOrder(step, queryRunner);

        step.승인한다();
        const savedStep = await this.approvalStepSnapshotService.save(step, {
            queryRunner,
            relations: ['approver'],
        });

        const commentContent =
            (dto.comment?.trim() ?? '') || (step.stepType === ApprovalStepType.AGREEMENT ? '협의 완료' : '승인');
        await this.commentService.createComment(
            {
                documentId: step.documentId,
                authorId: dto.userId,
                content: commentContent,
            },
            queryRunner,
        );

        await this.checkAndUpdateDocumentStatus(step.documentId, queryRunner);

        this.logger.log(`승인/협의완료 완료: stepSnapshotId=${dto.stepSnapshotId}`);
        return savedStep;
    }

    /**
     * 결재 반려 또는 협의 반려 (통합)
     * stepSnapshotId로 단계 조회 후 stepType에 따라 결재/협의 반려 처리
     */
    async rejectStepOrRejectAgreement(
        dto: { stepSnapshotId: string; userId: string; comment: string },
        queryRunner?: QueryRunner,
    ) {
        this.logger.log(`반려 시작: stepSnapshotId=${dto.stepSnapshotId}, userId=${dto.userId}`);

        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: dto.stepSnapshotId },
            relations: ['approver', 'document'],
            queryRunner,
        });

        DocumentPolicyValidator.validateReceiverActionOrThrow(
            step.stepType,
            step.document.status,
            ReceiverAction.REJECT,
        );
        if (step.approverId !== dto.userId) {
            throw new ForbiddenException('해당 단계를 반려할 권한이 없습니다.');
        }
        if (step.status !== ApprovalStatus.PENDING) {
            throw new BadRequestException('대기 중인 단계만 반려할 수 있습니다.');
        }
        if (step.stepType !== ApprovalStepType.APPROVAL && step.stepType !== ApprovalStepType.AGREEMENT) {
            throw new BadRequestException('결재 또는 협의 단계만 반려할 수 있습니다.');
        }
        if (!dto.comment || dto.comment.trim().length === 0) {
            throw new BadRequestException('반려 사유를 입력해야 합니다.');
        }

        step.반려한다();
        const rejectedStep = await this.approvalStepSnapshotService.save(step, {
            queryRunner,
            relations: ['approver'],
        });
        await this.commentService.createComment(
            { documentId: step.documentId, authorId: dto.userId, content: dto.comment },
            queryRunner,
        );
        const document = step.document;
        document.반려한다();
        await this.documentService.save(document, { queryRunner });

        this.logger.log(`반려 완료: stepSnapshotId=${dto.stepSnapshotId}`);
        return rejectedStep;
    }

    /**
     * 참조 열람 확인 처리
     * 정책: 참조 단계는 문서 상태와 무관하게 열람 확인 가능 (수신자 정책에서 허용)
     */
    async markReferenceRead(
        dto: { stepSnapshotId: string; referenceUserId: string; comment?: string },
        queryRunner?: QueryRunner,
    ) {
        this.logger.log(`참조 열람 확인 시작: ${dto.stepSnapshotId}`);

        // 1) Step 조회
        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: dto.stepSnapshotId },
            relations: ['approver', 'document'],
            queryRunner,
        });

        // 2) 정책 검증: 수신자 액션 가능 여부
        DocumentPolicyValidator.validateReceiverActionOrThrow(
            step.stepType,
            step.document.status,
            ReceiverAction.READ_REFERENCE,
        );

        // 3) 권한 확인
        if (step.approverId !== dto.referenceUserId) {
            throw new ForbiddenException('해당 참조 문서를 열람 확인할 권한이 없습니다.');
        }

        // 4) 단계 타입 확인
        if (step.stepType !== ApprovalStepType.REFERENCE) {
            throw new BadRequestException('참조 단계만 열람 확인할 수 있습니다.');
        }

        // 5) 상태 확인 (이미 열람한 경우는 중복 처리 허용)
        if (step.status === ApprovalStatus.APPROVED) {
            this.logger.warn(`이미 열람 확인된 참조 단계입니다: ${dto.stepSnapshotId}`);
            return step;
        }

        if (step.status !== ApprovalStatus.PENDING) {
            throw new BadRequestException('대기 중인 참조만 열람 확인할 수 있습니다.');
        }

        // 6) 열람 확인 처리 (도메인 서비스 사용)
        step.승인한다(); // 열람 완료는 APPROVED로 표시

        const readStep = await this.approvalStepSnapshotService.save(step, { queryRunner, relations: ['approver'] });

        // 7) 코멘트: 요청값이 있으면 해당 값, 없으면 기본값 저장
        const commentContent = (dto.comment?.trim() ?? '') || '참조 열람';
        await this.commentService.createComment(
            {
                documentId: step.documentId,
                authorId: dto.referenceUserId,
                content: commentContent,
            },
            queryRunner,
        );

        this.logger.log(`참조 열람 확인 완료: ${dto.stepSnapshotId}`);
        return readStep;
    }

    /**
     * 1. 결재 승인 처리
     * 정책: 결재진행중 상태의 문서에서만 결재 승인 가능
     */
    async approveStep(dto: ApproveStepDto, queryRunner?: QueryRunner) {
        this.logger.log(`결재 승인 시작: ${dto.stepSnapshotId}`);

        // 1) Step 조회
        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: dto.stepSnapshotId },
            relations: ['approver', 'document'],
            queryRunner,
        });

        // 2) 정책 검증: 수신자 액션 가능 여부
        DocumentPolicyValidator.validateReceiverActionOrThrow(
            step.stepType,
            step.document.status,
            ReceiverAction.APPROVE,
        );

        // 3) 권한 확인
        if (step.approverId !== dto.approverId) {
            throw new ForbiddenException('해당 결재를 승인할 권한이 없습니다.');
        }

        // 4) 상태 확인
        if (step.status !== ApprovalStatus.PENDING) {
            throw new BadRequestException('대기 중인 결재만 승인할 수 있습니다.');
        }

        // 5) 결재 단계가 APPROVAL인지 확인
        if (step.stepType !== ApprovalStepType.APPROVAL) {
            throw new BadRequestException('결재 단계만 승인할 수 있습니다.');
        }

        // 6) 결재 순서 검증
        await this.validateApprovalOrder(step, queryRunner);

        // 7) 승인 처리 (도메인 서비스 사용)
        step.승인한다();

        const approvedStep = await this.approvalStepSnapshotService.save(step, {
            queryRunner,
            relations: ['approver'],
        });

        // 8) 코멘트: 요청값이 있으면 해당 값, 없으면 기본값 저장
        const commentContent = (dto.comment?.trim() ?? '') || '승인';
        await this.commentService.createComment(
            {
                documentId: step.documentId,
                authorId: dto.approverId,
                content: commentContent,
            },
            queryRunner,
        );

        // 9) 다음 단계 확인 및 문서 상태 업데이트
        await this.checkAndUpdateDocumentStatus(step.documentId, queryRunner);

        this.logger.log(`결재 승인 완료: ${dto.stepSnapshotId}`);
        return approvedStep;
    }

    /**
     * 4. 시행 완료 처리
     * 정책: 결재완료 상태의 문서에서만 시행 가능
     */
    async completeImplementation(dto: CompleteImplementationDto, queryRunner?: QueryRunner) {
        this.logger.log(`시행 완료 시작: ${dto.stepSnapshotId}`);

        // 1) Step 조회
        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: dto.stepSnapshotId },
            relations: ['approver', 'document'],
            queryRunner,
        });

        // 2) 정책 검증: 수신자 액션 가능 여부
        DocumentPolicyValidator.validateReceiverActionOrThrow(
            step.stepType,
            step.document.status,
            ReceiverAction.COMPLETE_IMPLEMENTATION,
        );

        // 3) 권한 확인
        if (step.approverId !== dto.implementerId) {
            throw new ForbiddenException('해당 시행을 완료할 권한이 없습니다.');
        }

        // 4) 단계 타입 확인
        if (step.stepType !== ApprovalStepType.IMPLEMENTATION) {
            throw new BadRequestException('시행 단계만 처리할 수 있습니다.');
        }

        // 5) 상태 확인
        if (step.status !== ApprovalStatus.PENDING) {
            throw new BadRequestException('대기 중인 시행만 완료할 수 있습니다.');
        }

        // 6) 시행 완료 처리 (도메인 서비스 사용)
        step.승인한다();

        const completedStep = await this.approvalStepSnapshotService.save(step, {
            queryRunner,
            relations: ['approver'],
        });

        // 7) 코멘트: 요청값이 있으면 해당 값, 없으면 기본값 저장
        const commentContent = (dto.comment?.trim() ?? '') || '시행 완료';
        await this.commentService.createComment(
            {
                documentId: step.documentId,
                authorId: dto.implementerId,
                content: commentContent,
            },
            queryRunner,
        );

        // 8) Document 상태를 IMPLEMENTED로 변경
        const document = step.document;
        document.시행완료한다();
        if (dto.resultData) {
            document.메타데이터를설정한다(dto.resultData);
        }

        await this.documentService.save(document, { queryRunner });

        this.logger.log(`시행 완료: ${dto.stepSnapshotId}`);
        return completedStep;
    }

    /**
     * 2. 결재 반려 처리
     * 정책: 결재진행중 상태의 문서에서만 결재 반려 가능
     */
    async rejectStep(dto: RejectStepDto, queryRunner?: QueryRunner) {
        this.logger.log(`결재 반려 시작: ${dto.stepSnapshotId}`);

        // 1) Step 조회
        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: dto.stepSnapshotId },
            relations: ['approver', 'document'],
            queryRunner,
        });

        // 2) 정책 검증: 수신자 액션 가능 여부
        DocumentPolicyValidator.validateReceiverActionOrThrow(
            step.stepType,
            step.document.status,
            ReceiverAction.REJECT,
        );

        // 3) 권한 확인
        if (step.approverId !== dto.approverId) {
            throw new ForbiddenException('해당 결재를 반려할 권한이 없습니다.');
        }

        // 4) 상태 확인
        if (step.status !== ApprovalStatus.PENDING) {
            throw new BadRequestException('대기 중인 결재만 반려할 수 있습니다.');
        }

        // 5) 반려 사유 확인
        if (!dto.comment || dto.comment.trim().length === 0) {
            throw new BadRequestException('반려 사유를 입력해야 합니다.');
        }

        // 6) 반려 처리 (도메인 서비스 사용)
        step.반려한다();

        const rejectedStep = await this.approvalStepSnapshotService.save(step, {
            queryRunner,
            relations: ['approver'],
        });

        // 8) 반려 사유를 Comment 엔티티로 생성
        await this.commentService.createComment(
            {
                documentId: step.documentId,
                authorId: dto.approverId,
                content: dto.comment,
            },
            queryRunner,
        );

        // 9) Document 상태를 REJECTED로 변경
        const document = step.document;
        document.반려한다();

        await this.documentService.save(document, { queryRunner });

        this.logger.log(`결재 반려 완료: ${dto.stepSnapshotId}`);
        return rejectedStep;
    }

    /**
     * 5. 결재취소 (결재자용)
     *
     * 정책:
     * - 반려(REJECTED)된 문서는 결재 취소 불가.
     * - 결재 진행 중(PENDING) 또는 결재 완료(APPROVED) 문서만 취소 가능.
     * - 기안자(1결재자): 해당 단계만 대기로 되돌리고, 상신취소는 비즈니스 레이어에서 documentContext.상신을취소한다 호출.
     * - 일반 결재자: 해당 단계만 대기로 되돌림; 문서가 결재 완료였으면 문서를 결재 진행 중으로 되돌림.
     */
    async 결재를취소한다(dto: CancelApprovalStepDto, queryRunner?: QueryRunner): Promise<CancelApprovalStepResultDto> {
        this.logger.log(`결재 취소 시작: ${dto.stepSnapshotId}, 결재자: ${dto.approverId}`);

        // 1) 결재 단계 조회
        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: dto.stepSnapshotId },
            relations: ['document'],
            queryRunner,
        });

        const document = step.document;

        // 2) 반려된 문서는 결재 취소 불가
        if (document.status === DocumentStatus.REJECTED) {
            throw new BadRequestException('반려된 문서는 결재 취소할 수 없습니다.');
        }

        // 3) 결재 진행 중 또는 결재 완료만 허용
        if (document.status !== DocumentStatus.PENDING && document.status !== DocumentStatus.APPROVED) {
            throw new BadRequestException('결재 진행 중이거나 결재 완료된 문서만 결재 취소할 수 있습니다.');
        }

        // 4) 본인 결재 단계인지 확인
        if (step.approverId !== dto.approverId) {
            throw new ForbiddenException('본인의 결재 단계만 취소할 수 있습니다.');
        }

        // // 5) 결재(APPROVAL) 단계만 취소 대상
        // if (step.stepType !== ApprovalStepType.APPROVAL) {
        //     throw new BadRequestException('결재 단계만 취소할 수 있습니다.');
        // }

        // 6) 승인 상태인지 확인
        if (step.status !== ApprovalStatus.APPROVED) {
            throw new BadRequestException('승인한 결재만 취소할 수 있습니다.');
        }

        const reason = (dto.reason?.trim() ?? '') || '결재 취소';

        // 7) 기안자(1결재자) 여부: 첫 번째 결재 단계의 결재자가 기안자와 동일한 경우
        const allSteps = await this.approvalStepSnapshotService.findAll({
            where: { documentId: document.id },
            order: { stepOrder: 'ASC' },
            queryRunner,
        });
        const firstApprovalStep = allSteps.find((s) => s.stepType === ApprovalStepType.APPROVAL);
        const isDrafterFirstApprover =
            firstApprovalStep != null && firstApprovalStep.id === step.id && step.approverId === document.drafterId;

        // 8) 단계 대기로 되돌리기
        step.대기한다();
        await this.approvalStepSnapshotService.save(step, { queryRunner });

        // 일반 결재자: 문서가 결재 완료였으면 결재 진행 중으로 되돌림
        if (document.status === DocumentStatus.APPROVED) {
            document.결재진행중으로되돌린다();
            await this.documentService.save(document, { queryRunner });
        }

        await this.commentService.createComment(
            { documentId: step.documentId, authorId: dto.approverId, content: reason },
            queryRunner,
        );

        this.logger.log(`결재 취소 완료: stepId=${step.id}, documentId=${document.id}`);
        return {
            stepSnapshotId: step.id,
            documentId: document.id,
            message: '결재가 취소되었습니다.',
            isDrafterFirstApprover,
        };
    }

    /**
     * 6. 내 결재 대기 목록 조회 (페이징, 필터링)
     */
    async getMyPendingApprovals(
        userId: string,
        type: 'SUBMITTED' | 'AGREEMENT' | 'APPROVAL',
        page: number = 1,
        limit: number = 20,
        queryRunner?: QueryRunner,
    ) {
        const repository = queryRunner
            ? queryRunner.manager.getRepository(Document)
            : this.dataSource.getRepository(Document);

        const stepRepository = queryRunner
            ? queryRunner.manager.getRepository(ApprovalStepSnapshot)
            : this.dataSource.getRepository(ApprovalStepSnapshot);

        let documents: Document[] = [];
        const currentStepsMap = new Map<string, ApprovalStepSnapshot>(); // documentId -> currentStep
        let totalItems = 0;

        if (type === 'SUBMITTED') {
            // 상신: 내가 기안한 문서들 중 결재 대기 중인 문서
            const qb = repository
                .createQueryBuilder('document')
                .leftJoinAndSelect('document.drafter', 'drafter')
                .where('document.drafterId = :userId', { userId })
                .andWhere('document.status = :status', { status: DocumentStatus.PENDING })
                .orderBy('document.createdAt', 'DESC');

            // 전체 개수 조회
            totalItems = await qb.getCount();

            // 페이징 처리
            const skip = (page - 1) * limit;
            documents = await qb.skip(skip).take(limit).getMany();
        } else {
            // 합의/미결: 내가 처리해야 하는 문서들
            const stepType = type === 'AGREEMENT' ? ApprovalStepType.AGREEMENT : ApprovalStepType.APPROVAL;

            const qb = stepRepository
                .createQueryBuilder('step')
                .leftJoinAndSelect('step.document', 'document')
                .leftJoinAndSelect('document.drafter', 'drafter')
                .where('step.approverId = :userId', { userId })
                .andWhere('step.stepType = :stepType', { stepType })
                .andWhere('step.status = :status', { status: ApprovalStatus.PENDING })
                .orderBy('step.createdAt', 'DESC');

            // 전체 개수 조회
            totalItems = await qb.getCount();

            // 페이징 처리
            const skip = (page - 1) * limit;
            const steps = await qb.skip(skip).take(limit).getMany();

            // 실제 처리 가능한 단계만 필터링하고 문서 추출
            for (const step of steps) {
                const allSteps = await this.approvalStepSnapshotService.findAll({
                    where: { documentId: step.documentId },
                    order: { stepOrder: 'ASC' },
                    queryRunner,
                });

                if (await this.canProcessStepOptimized(step, allSteps)) {
                    documents.push(step.document);
                    currentStepsMap.set(step.documentId, step);
                }
            }
        }

        // 응답 데이터 변환 (문서 중심)
        const data = await Promise.all(
            documents.map(async (doc) => {
                const currentStep = currentStepsMap.get(doc.id);

                // 전체 결재 단계 조회
                const allApprovalSteps = await this.approvalStepSnapshotService.findAll({
                    where: { documentId: doc.id },
                    relations: ['approver'],
                    order: { stepOrder: 'ASC' },
                    queryRunner,
                });

                // 결재 단계 요약 정보 생성
                const approvalSteps = allApprovalSteps.map((step) => ({
                    id: step.id,
                    stepOrder: step.stepOrder,
                    stepType: step.stepType,
                    status: step.status,
                    approverId: step.approverId,
                    approverName: step.approverSnapshot?.employeeName || step.approver?.name || '',
                    comment: step.comment,
                    approvedAt: step.approvedAt,
                }));

                // 현재 단계 정보 생성 (합의/미결일 때만)
                const currentStepInfo = currentStep
                    ? {
                          id: currentStep.id,
                          stepOrder: currentStep.stepOrder,
                          stepType: currentStep.stepType,
                          status: currentStep.status,
                          approverId: currentStep.approverId,
                          approverSnapshot: currentStep.approverSnapshot,
                      }
                    : undefined;

                return {
                    documentId: doc.id,
                    documentNumber: doc.documentNumber,
                    title: doc.title,
                    status: doc.status,
                    drafterId: doc.drafterId,
                    drafterName: doc.drafter?.name || '',
                    drafterDepartmentName: undefined, // TODO: 기안자 부서 정보 추가 필요
                    currentStep: currentStepInfo,
                    approvalSteps,
                    submittedAt: doc.submittedAt,
                    createdAt: doc.createdAt,
                };
            }),
        );

        // 페이징 메타데이터 계산
        const totalPages = Math.ceil(totalItems / limit);

        return {
            data,
            meta: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }

    /**
     * 7. 문서의 결재 단계 목록 조회
     */
    async getApprovalSteps(documentId: string, queryRunner?: QueryRunner) {
        // 1) Document 존재 확인
        const document = await this.documentService.findOne({
            where: { id: documentId },
            queryRunner,
        });

        if (!document) {
            throw new NotFoundException(`문서를 찾을 수 없습니다: ${documentId}`);
        }

        // 2) 결재 단계 목록 조회
        return await this.approvalStepSnapshotService.findAll({
            where: { documentId },
            relations: ['approver', 'document'],
            order: { stepOrder: 'ASC' },
            queryRunner,
        });
    }

    /**
     * 8. 문서의 모든 결재 단계 조회 (순서대로)
     */
    async getApprovalStepsByDocumentId(documentId: string, queryRunner?: QueryRunner): Promise<ApprovalStepSnapshot[]> {
        return await this.approvalStepSnapshotService.findAll({
            where: { documentId },
            order: { stepOrder: 'ASC' },
            queryRunner,
        });
    }

    /**
     * 헬퍼: 다음 단계 확인 및 문서 상태 업데이트 (DocumentPolicyValidator 활용)
     */
    private async checkAndUpdateDocumentStatus(documentId: string, queryRunner: QueryRunner) {
        // 1) 모든 결재 단계 조회
        const allSteps = await this.approvalStepSnapshotService.findAll({
            where: { documentId },
            order: { stepOrder: 'ASC' },
            queryRunner,
        });

        // 2) 문서 조회
        const document = await this.documentService.findOneWithError({
            where: { id: documentId },
            queryRunner,
        });

        // 3) 정책 기반 다음 문서 상태 결정
        const nextStatus = DocumentPolicyValidator.determineNextDocumentStatus(document.status, allSteps);

        if (nextStatus) {
            document.승인완료한다();
            await this.documentService.save(document, { queryRunner });
            this.logger.log(`문서 상태 업데이트: ${documentId} -> ${nextStatus}`);
        } else {
            this.logger.log(`문서 상태 변경 조건 미충족: ${documentId}`);
        }
    }

    /**
     * 검증: 결재 순서 검증 (DocumentPolicyValidator 활용)
     * 규칙: 내 순서(stepOrder)보다 앞선 모든 단계가 승인(APPROVED)되어 있어야 함.
     */
    private async validateApprovalOrder(currentStep: ApprovalStepSnapshot, queryRunner: QueryRunner) {
        // 모든 단계 조회
        const allSteps = await this.approvalStepSnapshotService.findAll({
            where: { documentId: currentStep.documentId },
            order: { stepOrder: 'ASC' },
            queryRunner,
        });

        // DocumentPolicyValidator를 사용하여 결재 순서 검증
        DocumentPolicyValidator.validateApprovalOrderOrThrow(currentStep.stepType, currentStep.stepOrder, allSteps);

        this.logger.debug(`결재 순서 검증 통과: ${currentStep.id}`);
    }

    /**
     * 기안자 자동 승인 처리
     * 조건:
     * - 합의 단계가 없음
     * - 첫 번째 결재 단계가 APPROVAL 타입
     * - 첫 번째 결재자가 기안자 본인
     */
    async autoApproveIfDrafterIsFirstApprover(
        documentId: string,
        drafterId: string,
        queryRunner?: QueryRunner,
    ): Promise<void> {
        // 1) 모든 결재 단계 조회
        const allSteps = await this.approvalStepSnapshotService.findAll({
            where: { documentId },
            order: { stepOrder: 'ASC' },
            queryRunner,
        });

        if (allSteps.length === 0) {
            return; // 결재 단계가 없으면 처리하지 않음
        }

        // 2) 합의 단계가 있는지 확인
        // const hasAgreementStep = allSteps.some((step) => step.stepType === ApprovalStepType.AGREEMENT);
        // if (hasAgreementStep) {
        //     this.logger.debug('합의 단계가 있어 기안자 자동 승인을 건너뜁니다.');
        //     return; // 합의가 있으면 자동 승인하지 않음
        // }

        // 3) 첫 번째 단계 확인
        const firstStep = allSteps[0];

        // 4) 조건 확인: APPROVAL 타입이고, 결재자가 기안자 본인인지
        if (
            firstStep.stepType === ApprovalStepType.APPROVAL &&
            firstStep.approverId === drafterId &&
            firstStep.status === ApprovalStatus.PENDING
        ) {
            this.logger.log(`기안자가 첫 번째 결재자입니다. 자동 승인 처리: ${firstStep.id}`);

            // 5) 자동 승인 처리 (Entity Setter 사용)
            firstStep.승인한다();
            await this.approvalStepSnapshotService.save(firstStep, { queryRunner });

            // 6) 자동 승인 의견을 Comment 엔티티로 생성
            await this.commentService.createComment(
                {
                    documentId,
                    authorId: drafterId,
                    content: '기안자 자동 승인',
                },
                queryRunner,
            );

            // 6) 다음 단계 확인 및 문서 상태 업데이트
            // 다음 결재자가 있는지 확인
            const nextApprovalStep = allSteps.find(
                (step) =>
                    step.stepOrder > firstStep.stepOrder &&
                    (step.stepType === ApprovalStepType.APPROVAL || step.stepType === ApprovalStepType.AGREEMENT) &&
                    step.status === ApprovalStatus.PENDING,
            );

            // 다음 결재자가 없으면 문서 상태를 APPROVED로 변경
            if (!nextApprovalStep) {
                // 시행 단계 유무와 관계없이 문서 상태 APPROVED로 변경
                const document = await this.documentService.findOneWithError({
                    where: { id: documentId },
                    queryRunner,
                });
                document.승인완료한다();
                await this.documentService.save(document, { queryRunner });
            }

            this.logger.log(`기안자 자동 승인 완료: ${firstStep.id}`);
        }
    }

    /**
     * 검증: 단계 처리 가능 여부 확인
     *
     * 대기 목록 API에서 사용하여 실제 처리 가능한 건만 반환
     */
    private async canProcessStepOptimized(step: any, allSteps: any[]): Promise<boolean> {
        try {
            // 1) 협의는 언제나 처리 가능
            if (step.stepType === ApprovalStepType.AGREEMENT) {
                return true;
            }

            // 2) 결재인 경우
            if (step.stepType === ApprovalStepType.APPROVAL) {
                // 협의가 있다면 모든 협의가 완료되어야 함
                const agreementSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.AGREEMENT);
                if (agreementSteps.length > 0) {
                    const allAgreementsCompleted = agreementSteps.every((s) => s.status === ApprovalStatus.APPROVED);
                    if (!allAgreementsCompleted) {
                        return false;
                    }
                }

                // 이전 결재 단계가 모두 완료되어야 함
                const approvalSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.APPROVAL);
                for (const prevStep of approvalSteps) {
                    if (prevStep.stepOrder < step.stepOrder) {
                        if (prevStep.status !== ApprovalStatus.APPROVED) {
                            return false;
                        }
                    }
                }

                return true;
            }

            // 3) 시행인 경우
            if (step.stepType === ApprovalStepType.IMPLEMENTATION) {
                // 협의가 모두 완료되어야 함
                const agreementSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.AGREEMENT);
                if (agreementSteps.length > 0) {
                    const allAgreementsCompleted = agreementSteps.every((s) => s.status === ApprovalStatus.APPROVED);
                    if (!allAgreementsCompleted) {
                        return false;
                    }
                }

                // 모든 결재가 완료되어야 함
                const approvalSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.APPROVAL);
                if (approvalSteps.length > 0) {
                    const allApprovalsCompleted = approvalSteps.every((s) => s.status === ApprovalStatus.APPROVED);
                    if (!allApprovalsCompleted) {
                        return false;
                    }
                }

                return true;
            }

            return false;
        } catch (error) {
            this.logger.error(`canProcessStepOptimized 오류: ${error.message}`);
            return false;
        }
    }

    private async canProcessStep(step: any, queryRunner?: QueryRunner): Promise<boolean> {
        try {
            // 모든 단계 조회
            const allSteps = await this.approvalStepSnapshotService.findAll({
                where: { documentId: step.documentId },
                order: { stepOrder: 'ASC' },
                queryRunner,
            });

            // 1) 협의는 언제나 처리 가능
            if (step.stepType === ApprovalStepType.AGREEMENT) {
                return true;
            }

            // 2) 결재인 경우
            if (step.stepType === ApprovalStepType.APPROVAL) {
                // 협의가 있다면 모든 협의가 완료되어야 함
                const agreementSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.AGREEMENT);
                if (agreementSteps.length > 0) {
                    const allAgreementsCompleted = agreementSteps.every((s) => s.status === ApprovalStatus.APPROVED);
                    if (!allAgreementsCompleted) {
                        return false;
                    }
                }

                // 이전 결재 단계가 모두 완료되어야 함
                const approvalSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.APPROVAL);
                for (const prevStep of approvalSteps) {
                    if (prevStep.stepOrder < step.stepOrder) {
                        if (prevStep.status !== ApprovalStatus.APPROVED) {
                            return false;
                        }
                    }
                }

                return true;
            }

            // 3) 시행인 경우
            if (step.stepType === ApprovalStepType.IMPLEMENTATION) {
                // 협의가 모두 완료되어야 함
                const agreementSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.AGREEMENT);
                if (agreementSteps.length > 0) {
                    const allAgreementsCompleted = agreementSteps.every((s) => s.status === ApprovalStatus.APPROVED);
                    if (!allAgreementsCompleted) {
                        return false;
                    }
                }

                // 모든 결재가 완료되어야 함
                const approvalSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.APPROVAL);
                const allApprovalsCompleted = approvalSteps.every((s) => s.status === ApprovalStatus.APPROVED);
                return allApprovalsCompleted;
            }

            // 4) 참조는 처리 불필요
            if (step.stepType === ApprovalStepType.REFERENCE) {
                return false;
            }

            return false;
        } catch (error) {
            this.logger.error(`단계 처리 가능 여부 확인 실패: ${step.id}`, error);
            return false;
        }
    }
}
