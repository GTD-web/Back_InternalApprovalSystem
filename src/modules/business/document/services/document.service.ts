import { Injectable, Logger } from '@nestjs/common';
import { DocumentContext } from '../../../context/document/document.context';
import { DocumentQueryService } from '../../../context/document/document-query.service';
import { TemplateContext } from '../../../context/template/template.context';
import { ApprovalProcessContext } from '../../../context/approval-process/approval-process.context';
import { NotificationContext } from '../../../context/notification/notification.context';
import { DocumentNotificationService } from '../../../context/notification/document-notification.service';
import { CommentNotificationService } from '../../../context/notification/comment-notification.service';
import { CommentContext } from '../../../context/comment/comment.context';
import {
    CreateDocumentDto,
    DocumentResponseDto,
    UpdateDocumentDto,
    SubmitDocumentDto,
    SubmitDocumentDirectDto,
    CreateTestDocumentDto,
} from '../dtos';
import {
    CreateDocumentDto as ContextCreateDocumentDto,
    DocumentFilterDto,
} from '../../../context/document/dtos/document.dto';
import { ApprovalStepType, DocumentStatus } from 'src/common/enums/approval.enum';
import type { ApprovalStepSnapshotItemDto } from '../dtos/approval-step-snapshot.dto';
import { CreateCommentDto, UpdateCommentDto } from '../dtos/comment.dto';
import { withTransaction } from 'src/common/utils/transaction.util';
import { DataSource, In } from 'typeorm';
import { ApproverMappingService } from 'src/modules/context/template/approver-mapping.service';
import { DocumentPolicyValidator, DrafterAction } from 'src/common/utils/document-policy.validator';
import { getDocumentActionButtons } from 'src/common/utils/document-action-buttons.util';
import { MailService } from '../../../integrations/notification/mail.service';
import { PORTAL_HOME_URL } from '../../../integrations/notification/notification.constants';
import { DomainEmployeeService } from '../../../domain/employee/employee.service';
import { submitApprovalLineMailHtml을생성한다 } from '../utils/submit-approval-line-mail.template';

/**
 * 문서 비즈니스 서비스
 * 문서 CRUD 및 기안 관련 비즈니스 로직을 담당합니다.
 */
@Injectable()
export class DocumentService {
    private readonly logger = new Logger(DocumentService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly documentContext: DocumentContext,
        private readonly documentQueryService: DocumentQueryService,
        private readonly templateContext: TemplateContext,
        private readonly approverMappingService: ApproverMappingService,
        private readonly approvalProcessContext: ApprovalProcessContext,
        private readonly notificationContext: NotificationContext,
        private readonly documentNotificationService: DocumentNotificationService,
        private readonly commentNotificationService: CommentNotificationService,
        private readonly commentContext: CommentContext,
        private readonly mailService: MailService,
        private readonly employeeService: DomainEmployeeService,
    ) {}

    /**
     * 문서 생성 (임시저장)
     */
    async createDocument(dto: CreateDocumentDto, drafterId: string) {
        this.logger.log(`문서 생성 시작: ${dto.title}`);

        const contextDto: ContextCreateDocumentDto = {
            documentTemplateId: dto.documentTemplateId,
            title: dto.title,
            content: dto.content,
            drafterId: drafterId,
            metadata: dto.metadata,
            approvalSteps: dto.approvalSteps?.map((step) => ({
                stepOrder: step.stepOrder,
                stepType: step.stepType,
                approverId: step.approverId,
            })),
        };
        return await withTransaction(this.dataSource, async (queryRunner) => {
            const document = await this.documentContext.createDocument(contextDto, queryRunner);

            // 4) 결재단계 스냅샷 생성 (제공된 경우)
            if (dto.approvalSteps && dto.approvalSteps.length > 0) {
                await this.documentContext.createApprovalStepSnapshots(document.id, dto.approvalSteps, queryRunner);
            }

            return document;
        });
    }

    /**
     * 문서 수정
     * 정책: 임시저장/결재진행중 상태에서만 내용 수정 가능
     */
    async updateDocument(documentId: string, dto: UpdateDocumentDto) {
        this.logger.log(`문서 수정 시작: ${documentId}`);

        // 1) 문서 조회 및 정책 검증
        const document = await this.documentQueryService.getDocument(documentId);

        // 2) 내용 수정 정책 검증
        DocumentPolicyValidator.validateDrafterActionOrThrow(document.status, DrafterAction.UPDATE_CONTENT);

        // 3) 결재선 수정 정책 검증 (결재선 수정 요청 시)
        if (dto.approvalSteps !== undefined) {
            DocumentPolicyValidator.validateDrafterActionOrThrow(document.status, DrafterAction.UPDATE_APPROVAL_LINE);
        }

        const fullContextDto = {
            title: dto.title,
            content: dto.content,
            comment: dto.comment,
            metadata: dto.metadata,
            approvalSteps: dto.approvalSteps?.map((step) => ({
                id: step.id,
                stepOrder: step.stepOrder,
                stepType: step.stepType,
                approverId: step.approverId,
            })),
        };

        return await withTransaction(this.dataSource, async (queryRunner) => {
            return await this.documentContext.updateDocument(documentId, fullContextDto, queryRunner);
        });
    }

    /**
     * 문서 삭제
     * 정책: 임시저장 상태에서만 삭제 가능
     */
    async deleteDocument(documentId: string) {
        this.logger.log(`문서 삭제 시작: ${documentId}`);

        // 1) 문서 조회 및 정책 검증
        const document = await this.documentQueryService.getDocument(documentId);

        // 2) 삭제 정책 검증
        DocumentPolicyValidator.validateDrafterActionOrThrow(document.status, DrafterAction.DELETE);

        return await this.documentContext.deleteDocument(documentId);
    }

    /**
     * 문서 조회 (단건)
     * @param documentId 문서 ID
     * @param userId 현재 사용자 ID (액션 버튼 계산용, 선택적)
     * @returns DocumentResponseDto (userId 있으면 actionButtons 포함)
     */
    async getDocument(documentId: string, userId?: string): Promise<DocumentResponseDto> {
        this.logger.debug(`문서 조회: ${documentId}, 사용자: ${userId || 'N/A'}`);
        const document = await this.documentQueryService.getDocument(documentId);
        if (!userId) {
            return document;
        }
        const actionButtons = getDocumentActionButtons(document, userId);
        return { ...document, actionButtons } as DocumentResponseDto;
    }

    /**
     * 문서 목록 조회 (페이징, 필터링)
     */
    async getDocuments(filter: DocumentFilterDto) {
        this.logger.debug('문서 목록 조회', filter);
        return await this.documentQueryService.getDocuments(filter);
    }

    /**
     * 문서 기안 (임시저장된 문서 기반)
     * 정책: 임시저장 상태에서만 상신 가능
     */
    async submitDocument(dto: SubmitDocumentDto) {
        this.logger.log(`문서 기안 시작: ${dto.documentId}`);

        // 1) 문서 조회 및 정책 검증
        const document = await this.documentQueryService.getDocument(dto.documentId);

        // 2) 상신 정책 검증
        DocumentPolicyValidator.validateDrafterActionOrThrow(document.status, DrafterAction.SUBMIT);

        const contextDto = {
            documentId: dto.documentId,
            documentTemplateId: dto.documentTemplateId,
            metadata: dto.metadata,
            approvalSteps: dto.approvalSteps?.map((step) => ({
                stepOrder: step.stepOrder,
                stepType: step.stepType,
                approverId: step.approverId,
            })),
        };

        // 3) 문서 기안 처리 (트랜잭션)
        const submittedDocument = await withTransaction(this.dataSource, async (queryRunner) => {
            return await this.documentContext.submitDocument(contextDto, queryRunner);
        });

        // 2) 기안자 자동 승인 처리 (조건부, 별도 트랜잭션)
        await this.approvalProcessContext.autoApproveIfDrafterIsFirstApprover(
            submittedDocument.id,
            submittedDocument.drafterId,
        );

        // 3) 알림 후 결재선 메일 (비동기, 실패해도 전체 프로세스에 영향 없음)
        this.기안후알림및메일을비동기로처리한다(submittedDocument.id, submittedDocument.drafterId);

        this.logger.log(`문서 기안 및 자동 승인 처리 완료: ${submittedDocument.id}`);
        return submittedDocument;
    }

    /**
     * 바로 기안 (임시저장 없이 바로 기안)
     * 내부적으로 임시저장 후 기안하는 방식으로 처리됩니다.
     */
    async submitDocumentDirect(dto: SubmitDocumentDirectDto, drafterId: string) {
        this.logger.log(`바로 기안 시작: ${dto.title}`);

        // 1. 임시저장 + 기안 처리 (트랜잭션)
        const createDto: ContextCreateDocumentDto = {
            drafterId: drafterId,
            documentTemplateId: dto.documentTemplateId,
            title: dto.title,
            content: dto.content,
            metadata: dto.metadata,
            approvalSteps: dto.approvalSteps,
        };

        const submittedDocument = await withTransaction(this.dataSource, async (queryRunner) => {
            // 1-1) 임시저장
            const draftDocument = await this.documentContext.createDocument(createDto, queryRunner);
            this.logger.debug(`임시저장 완료: ${draftDocument.id}`);

            // 1-2) 기안
            const submitDto: SubmitDocumentDto = {
                documentId: draftDocument.id,
                documentTemplateId: dto.documentTemplateId,
                metadata: dto.metadata,
                approvalSteps: dto.approvalSteps,
            };
            return await this.documentContext.submitDocument(submitDto, queryRunner);
        });

        // 2) 기안자 자동 승인 처리 (조건부, 별도 트랜잭션)
        await this.approvalProcessContext.autoApproveIfDrafterIsFirstApprover(
            submittedDocument.id,
            submittedDocument.drafterId,
        );

        // 3) 알림 후 결재선 메일 (비동기, 실패해도 전체 프로세스에 영향 없음)
        this.기안후알림및메일을비동기로처리한다(submittedDocument.id, submittedDocument.drafterId);

        this.logger.log(`바로 기안 및 자동 승인 처리 완료: ${submittedDocument.id}`);
        return submittedDocument;
    }

    /**
     * 합의자별 바로 기안 (바로기안 API와 동일한 DTO 사용)
     * 들어온 결재선(approvalSteps)에서 합의(AGREEMENT) 단계를 분리하여,
     * 합의자 수만큼 결재선을 만든 뒤 각각 문서 1건씩 상신합니다.
     * 예: 결재1-합의2-합의3-합의4-결재5 → (결재1-합의2-결재5), (결재1-합의3-결재5), (결재1-합의4-결재5) 3건 상신
     */
    async submitDocumentDirectPerConsulter(
        dto: SubmitDocumentDirectDto,
        drafterId: string,
    ): Promise<DocumentResponseDto[]> {
        if (!dto.approvalSteps?.length) {
            this.logger.warn('합의자별 바로 기안: approvalSteps가 없어 단일 상신으로 처리합니다.');
            const one = await this.submitDocumentDirect(dto, drafterId);
            return [one as DocumentResponseDto];
        }

        const steps = [...dto.approvalSteps].sort((a, b) => a.stepOrder - b.stepOrder);
        const agreementSteps = steps.filter((s) => s.stepType === ApprovalStepType.AGREEMENT);
        const nonAgreementSteps = steps.filter((s) => s.stepType !== ApprovalStepType.AGREEMENT);

        if (agreementSteps.length === 0) {
            this.logger.warn('합의자별 바로 기안: 합의 단계가 없어 단일 상신으로 처리합니다.');
            const one = await this.submitDocumentDirect(dto, drafterId);
            return [one as DocumentResponseDto];
        }

        const minAgreementOrder = Math.min(...agreementSteps.map((s) => s.stepOrder));
        const maxAgreementOrder = Math.max(...agreementSteps.map((s) => s.stepOrder));
        const beforeAgreement = nonAgreementSteps.filter((s) => s.stepOrder < minAgreementOrder);
        const afterAgreement = nonAgreementSteps.filter((s) => s.stepOrder > maxAgreementOrder);

        // 1) 단일 트랜잭션으로 전건 생성·기안 (하나라도 실패 시 전부 롤백)
        const submittedList = await withTransaction(this.dataSource, async (queryRunner) => {
            const list: Awaited<ReturnType<DocumentContext['submitDocument']>>[] = [];
            for (const agreementStep of agreementSteps) {
                const line: ApprovalStepSnapshotItemDto[] = [...beforeAgreement, agreementStep, ...afterAgreement].map(
                    (s, idx) => ({ ...s, stepOrder: idx + 1 }),
                );

                const createDto: ContextCreateDocumentDto = {
                    drafterId,
                    documentTemplateId: dto.documentTemplateId,
                    title: dto.title,
                    content: dto.content,
                    metadata: dto.metadata,
                    approvalSteps: line,
                };

                const draft = await this.documentContext.createDocument(createDto, queryRunner);
                const submitDto: SubmitDocumentDto = {
                    documentId: draft.id,
                    documentTemplateId: dto.documentTemplateId,
                    metadata: dto.metadata,
                    approvalSteps: line,
                };
                const submitted = await this.documentContext.submitDocument(submitDto, queryRunner);
                list.push(submitted);
            }
            return list;
        });

        // 2) 트랜잭션 성공 후 자동 승인 및 알림 전송
        for (const submitted of submittedList) {
            await this.approvalProcessContext.autoApproveIfDrafterIsFirstApprover(submitted.id, submitted.drafterId);
            this.기안후알림및메일을비동기로처리한다(submitted.id, submitted.drafterId);
        }

        this.logger.log(`합의자별 바로 기안 완료: ${submittedList.length}건`);
        return submittedList as DocumentResponseDto[];
    }

    /**
     * 기안 직후 푸시(알림) 전송이 끝난 뒤, 결재선 직원에게 메일을 보낸다.
     * HTTP 응답과 무관하게 비동기 실행되며, 각 단계 실패는 로그만 남긴다.
     */
    private 기안후알림및메일을비동기로처리한다(documentId: string, drafterId: string): void {
        void (async () => {
            try {
                await this.sendSubmitNotification(documentId, drafterId);
            } catch (error) {
                this.logger.error(`문서 기안 알림 전송 실패: ${documentId}`, error);
            }
            try {
                await this.sendSubmitEmailsToApprovalLine(documentId);
            } catch (error) {
                this.logger.error(`문서 기안 결재선 메일 전송 실패: ${documentId}`, error);
            }
        })();
    }

    /**
     * 결재선(모든 스냅샷 단계)의 결재자·참조 등 approverId에 해당하는 직원 이메일로 상신 안내 메일을 보낸다.
     */
    private async sendSubmitEmailsToApprovalLine(documentId: string): Promise<void> {
        const document = await this.documentQueryService.getDocument(documentId);
        const allSteps = await this.approvalProcessContext.getApprovalStepsByDocumentId(documentId);
        const approverIds = [...new Set(allSteps.map((s) => s.approverId).filter(Boolean))];
        if (approverIds.length === 0) {
            this.logger.debug(`결재선 메일 생략 (결재자 없음): ${documentId}`);
            return;
        }

        const employees = await this.employeeService.findAll({
            where: { id: In(approverIds) },
        });
        const recipients = [
            ...new Set(
                employees.map((e) => e.email?.trim()).filter((email): email is string => Boolean(email?.includes('@'))),
            ),
        ];
        if (recipients.length === 0) {
            this.logger.warn(`결재선 메일 생략 (유효한 수신 이메일 없음): ${documentId}`);
            return;
        }

        const drafterName = document.drafter?.name ?? '기안자';
        const subject = `[결재 요청] ${document.title}`;
        const html = await submitApprovalLineMailHtml을생성한다({
            escapeHtml: (plain) => this.메일용Html이스케이프한다(plain),
            drafterName,
            documentTitle: document.title,
            documentId,
            portalHomeUrl: PORTAL_HOME_URL,
        });

        await this.mailService.sendMultiple({ recipients, subject, html });
        this.logger.log(`문서 기안 결재선 메일 전송 완료: ${documentId}, 수신 ${recipients.length}명`);
    }

    private 메일용Html이스케이프한다(text: string): string {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /**
     * 문서 기안 알림 전송 (private)
     */
    private async sendSubmitNotification(documentId: string, drafterId: string): Promise<void> {
        try {
            // 1) 문서 정보 조회 (drafter 포함)
            const document = await this.documentQueryService.getDocument(documentId);

            // 2) 결재 단계 조회
            const allSteps = await this.approvalProcessContext.getApprovalStepsByDocumentId(documentId);

            // 3) 기안자의 employeeNumber 조회
            const drafter = document.drafter;
            if (!drafter || !drafter.employeeNumber) {
                this.logger.warn(`기안자 정보를 찾을 수 없습니다: ${drafterId}`);
                return;
            }

            // 4) 알림 전송
            await this.documentNotificationService.sendNotificationAfterSubmit({
                document: {
                    id: document.id,
                    title: document.title,
                    drafterId: document.drafterId,
                    drafterName: drafter.name,
                    status: document.status,
                },
                allSteps,
                drafterEmployeeNumber: drafter.employeeNumber,
            });
        } catch (error) {
            this.logger.error(`문서 기안 알림 전송 중 오류 발생: ${documentId}`, error);
            throw error;
        }
    }

    /**
     * 새 문서 작성용 템플릿 상세 조회 (결재자 정보 맵핑 포함)
     */
    async getTemplateForNewDocument(templateId: string, drafterId: string) {
        this.logger.debug(`템플릿 상세 조회 (결재자 맵핑): ${templateId}, 기안자: ${drafterId}`);
        return await this.approverMappingService.getDocumentTemplateWithMappedApprovers(templateId, drafterId);
    }

    /**
     * 문서 통계 조회
     */
    async getDocumentStatistics(userId: string) {
        this.logger.debug(`문서 통계 조회: 사용자 ${userId}`);
        return await this.documentQueryService.getDocumentStatistics(userId);
    }

    /**
     * 내 전체 문서 통계 조회 (작성 + 결재라인)
     */
    async getMyAllDocumentsStatistics(userId: string) {
        this.logger.debug(`내 전체 문서 통계 조회: 사용자 ${userId}`);
        return await this.documentQueryService.getMyAllDocumentsStatistics(userId);
    }

    /**
     * 내 전체 문서 목록 조회 (작성 + 결재라인)
     */
    async getMyAllDocuments(params: {
        userId: string;
        filterType?: string;
        receivedStepType?: string;
        drafterFilter?: string;
        referenceReadStatus?: string;
        pendingStatusFilter?: string;
        searchKeyword?: string;
        startDate?: Date;
        endDate?: Date;
        sortOrder?: string;
        page?: number;
        limit?: number;
    }) {
        this.logger.debug('내 전체 문서 목록 조회', params);
        return await this.documentQueryService.getMyAllDocuments(params);
    }

    /**
     * 내가 작성한 문서 전체 조회
     * @param drafterId 기안자 ID
     * @param page 페이지 번호
     * @param limit 페이지당 항목 수
     * @param draftFilter DRAFT 상태 필터 (DRAFT_ONLY: 임시저장만, EXCLUDE_DRAFT: 임시저장 제외)
     */
    async getMyDrafts(drafterId: string, page: number, limit: number, draftFilter?: 'DRAFT_ONLY' | 'EXCLUDE_DRAFT') {
        this.logger.debug(
            `내가 작성한 문서 조회: 사용자 ${drafterId}, 페이지 ${page}, 제한 ${limit}, 필터 ${draftFilter || '없음'}`,
        );
        return await this.documentQueryService.getMyDrafts(drafterId, page, limit, draftFilter);
    }

    /**
     * 코멘트 작성
     */
    async createComment(documentId: string, dto: CreateCommentDto, authorId: string) {
        this.logger.log(`코멘트 작성: 문서 ${documentId}`);

        const savedComment = await this.commentContext.코멘트를작성한다({
            documentId: documentId,
            authorId: authorId,
            content: dto.content,
            parentCommentId: dto.parentCommentId,
        });

        // 알림 전송 (비동기, 실패해도 전체 프로세스에 영향 없음)
        this.commentNotificationService
            .sendCommentCreatedNotification({
                documentId,
                authorId,
                commentContent: dto.content,
            })
            .catch((error) => {
                this.logger.error('코멘트 작성 알림 전송 실패', error);
            });

        return savedComment;
    }

    /**
     * 코멘트 수정
     */
    async updateComment(commentId: string, dto: UpdateCommentDto, authorId: string) {
        this.logger.log(`코멘트 수정: ${commentId}`);

        const updatedComment = await this.commentContext.코멘트를수정한다({
            commentId: commentId,
            authorId: authorId,
            content: dto.content,
        });

        // 알림 전송 (비동기, 실패해도 전체 프로세스에 영향 없음)
        this.commentNotificationService
            .sendCommentUpdatedNotification({
                documentId: updatedComment.documentId,
                authorId,
                commentContent: dto.content,
            })
            .catch((error) => {
                this.logger.error('코멘트 수정 알림 전송 실패', error);
            });

        return updatedComment;
    }

    /**
     * 코멘트 삭제
     */
    async deleteComment(commentId: string, authorId: string) {
        this.logger.log(`코멘트 삭제: ${commentId}`);

        // 삭제 전 코멘트 정보 조회 (documentId 필요)
        const comment = await this.commentContext.코멘트를조회한다(commentId);
        const documentId = comment.documentId;

        const deletedComment = await this.commentContext.코멘트를삭제한다(commentId, authorId);

        // 알림 전송 (비동기, 실패해도 전체 프로세스에 영향 없음)
        this.commentNotificationService
            .sendCommentDeletedNotification({
                documentId,
                authorId,
            })
            .catch((error) => {
                this.logger.error('코멘트 삭제 알림 전송 실패', error);
            });

        return deletedComment;
    }

    /**
     * 문서의 코멘트 조회
     */
    async getDocumentComments(documentId: string) {
        this.logger.debug(`문서 코멘트 조회: ${documentId}`);
        return await this.commentContext.문서의코멘트를조회한다(documentId);
    }

    /**
     * 코멘트 상세 조회
     */
    async getComment(commentId: string) {
        this.logger.debug(`코멘트 조회: ${commentId}`);
        return await this.commentContext.코멘트를조회한다(commentId);
    }

    // ============================================
    // 🧪 테스트 데이터 생성
    // ============================================

    /**
     * 테스트 문서 생성
     * 개발/테스트 환경에서 다양한 상태의 문서를 빠르게 생성합니다.
     */
    async createTestDocument(dto: CreateTestDocumentDto) {
        this.logger.log(`테스트 문서 생성 시작: ${dto.title}`);

        return await withTransaction(this.dataSource, async (queryRunner) => {
            // 1. 문서 생성 (DocumentContext 사용)
            const document = await this.documentContext.createDocument(
                {
                    title: dto.title,
                    content: dto.content || '<p>테스트 문서 내용입니다.</p>',
                    drafterId: dto.drafterId,
                    metadata: { isTestDocument: true },
                },
                queryRunner,
            );

            // 2. 결재 단계 스냅샷 생성 (DocumentContext 사용)
            const approvalStepsForContext = dto.approvalSteps.map((step) => ({
                stepOrder: step.stepOrder,
                stepType: step.stepType,
                approverId: step.approverId,
            }));
            await this.documentContext.createApprovalStepSnapshots(document.id, approvalStepsForContext, queryRunner);

            // 3. 결재 단계 상태 업데이트 (테스트용으로 직접 업데이트)
            for (const step of dto.approvalSteps) {
                await queryRunner.manager.update(
                    'approval_step_snapshots',
                    { documentId: document.id, stepOrder: step.stepOrder },
                    {
                        status: step.status,
                        comment: step.comment || null,
                        approvedAt: step.status === 'APPROVED' ? new Date() : null,
                    },
                );
            }

            // 4. 문서 상태 및 번호 업데이트 (DRAFT가 아닌 경우)
            let documentNumber = '';
            if (dto.status !== DocumentStatus.DRAFT) {
                // 문서 번호 생성 (간단한 테스트용 번호)
                const timestamp = Date.now().toString().slice(-6);
                documentNumber = `TEST-${new Date().getFullYear()}-${timestamp}`;

                await queryRunner.manager.update(
                    'documents',
                    { id: document.id },
                    {
                        status: dto.status,
                        documentNumber: documentNumber,
                        submittedAt: new Date(),
                        ...(dto.status === DocumentStatus.APPROVED && { approvedAt: new Date() }),
                        ...(dto.status === DocumentStatus.REJECTED && { rejectedAt: new Date() }),
                        ...(dto.status === DocumentStatus.CANCELLED && { cancelledAt: new Date() }),
                    },
                );
            }

            this.logger.log(`테스트 문서 생성 완료: ${document.id}`);

            return {
                documentId: document.id,
                documentNumber: documentNumber || '(임시저장)',
                title: dto.title,
                status: dto.status,
                approvalStepsCount: dto.approvalSteps.length,
                message: '테스트 문서가 성공적으로 생성되었습니다.',
            };
        });
    }

    /**
     * 🧪 전체 데이터 삭제 및 기본 카테고리 생성 (개발/테스트용)
     * 문서, 템플릿, 카테고리 및 관련 데이터를 모두 삭제하고 기본 카테고리를 생성합니다.
     */
    async deleteAllDocuments(): Promise<{
        deletedApprovalStepSnapshots: number;
        deletedComments: number;
        deletedDocumentRevisions: number;
        deletedDocuments: number;
        deletedApprovalStepTemplates: number;
        deletedDocumentTemplates: number;
        deletedCategories: number;
        createdCategories: number;
        categories: { name: string; code: string }[];
        message: string;
    }> {
        this.logger.warn('⚠️ 전체 데이터 삭제 시작');

        return withTransaction(this.dataSource, async (queryRunner) => {
            // 1. 결재 단계 스냅샷 삭제 (문서 참조)
            const approvalStepSnapshotsResult = await queryRunner.query('DELETE FROM approval_step_snapshots');
            const deletedApprovalStepSnapshots = approvalStepSnapshotsResult[1] || 0;
            this.logger.log(`결재 단계 스냅샷 삭제: ${deletedApprovalStepSnapshots}건`);

            // 2. 코멘트 삭제 (문서 참조)
            const commentsResult = await queryRunner.query('DELETE FROM comments');
            const deletedComments = commentsResult[1] || 0;
            this.logger.log(`코멘트 삭제: ${deletedComments}건`);

            // 3. 문서 리비전 삭제 (문서 참조)
            const documentRevisionsResult = await queryRunner.query('DELETE FROM document_revisions');
            const deletedDocumentRevisions = documentRevisionsResult[1] || 0;
            this.logger.log(`문서 리비전 삭제: ${deletedDocumentRevisions}건`);

            // 4. 문서 삭제 (템플릿 참조)
            const documentsResult = await queryRunner.query('DELETE FROM documents');
            const deletedDocuments = documentsResult[1] || 0;
            this.logger.log(`문서 삭제: ${deletedDocuments}건`);

            // 5. 결재 단계 템플릿 삭제 (문서 템플릿 참조)
            const approvalStepTemplatesResult = await queryRunner.query('DELETE FROM approval_step_templates');
            const deletedApprovalStepTemplates = approvalStepTemplatesResult[1] || 0;
            this.logger.log(`결재 단계 템플릿 삭제: ${deletedApprovalStepTemplates}건`);

            // 6. 문서 템플릿 삭제 (카테고리 참조)
            const documentTemplatesResult = await queryRunner.query('DELETE FROM document_templates');
            const deletedDocumentTemplates = documentTemplatesResult[1] || 0;
            this.logger.log(`문서 템플릿 삭제: ${deletedDocumentTemplates}건`);

            // 7. 카테고리 삭제
            const categoriesResult = await queryRunner.query('DELETE FROM categories');
            const deletedCategories = categoriesResult[1] || 0;
            this.logger.log(`카테고리 삭제: ${deletedCategories}건`);

            // 8. 기본 카테고리 생성
            const defaultCategories = [
                { name: '기안문서', code: 'DRAFT', description: '일반 기안 문서', order: 1 },
                { name: '지출결의서', code: 'EXPENSE', description: '지출 결의 관련 문서', order: 2 },
                { name: '신청서', code: 'APPLICATION', description: '각종 신청 문서', order: 3 },
                { name: '보고서', code: 'REPORT', description: '업무 보고 문서', order: 4 },
                { name: '공문', code: 'OFFICIAL', description: '공식 문서', order: 5 },
                { name: '인사문서', code: 'HR', description: '인사 관련 문서', order: 6 },
                { name: '회계', code: 'ACCOUNTING', description: '회계 관련 문서', order: 7 },
            ];

            for (const category of defaultCategories) {
                await queryRunner.manager.insert('categories', category);
            }
            this.logger.log(`기본 카테고리 생성: ${defaultCategories.length}건`);

            this.logger.warn(
                `⚠️ 전체 데이터 삭제 및 초기화 완료: 문서 ${deletedDocuments}건 삭제, 카테고리 ${defaultCategories.length}건 생성`,
            );

            return {
                deletedApprovalStepSnapshots,
                deletedComments,
                deletedDocumentRevisions,
                deletedDocuments,
                deletedApprovalStepTemplates,
                deletedDocumentTemplates,
                deletedCategories,
                createdCategories: defaultCategories.length,
                categories: defaultCategories.map((c) => ({ name: c.name, code: c.code })),
                message: '전체 데이터가 삭제되고 기본 카테고리가 생성되었습니다.',
            };
        });
    }
}
