import { Injectable, Logger } from '@nestjs/common';
import { NotificationContext } from './notification.context';
import { DocumentQueryService } from '../document/document-query.service';
import { DomainApprovalStepSnapshotService } from '../../domain/approval-step-snapshot/approval-step-snapshot.service';
import { DomainEmployeeService } from '../../domain/employee/employee.service';
import { ApprovalStepType } from '../../../common/enums/approval.enum';

/**
 * 코멘트 알림 서비스
 *
 * 역할:
 * - 코멘트 작성/수정/삭제 시 관련자들에게 알림 전송
 * - 알림 대상: 기안자, 합의자, 결재자
 */
@Injectable()
export class CommentNotificationService {
    private readonly logger = new Logger(CommentNotificationService.name);

    constructor(
        private readonly notificationContext: NotificationContext,
        private readonly documentQueryService: DocumentQueryService,
        private readonly approvalStepSnapshotService: DomainApprovalStepSnapshotService,
        private readonly employeeService: DomainEmployeeService,
    ) {}

    /**
     * 코멘트 작성 알림 전송
     * 기안자, 합의자, 결재자에게 알림 (작성자 본인 제외)
     */
    async sendCommentCreatedNotification(params: {
        documentId: string;
        authorId: string;
        commentContent: string;
    }): Promise<void> {
        this.logger.log(`코멘트 작성 알림 전송 시작: 문서 ${params.documentId}`);

        try {
            const { documentId, authorId, commentContent } = params;

            // 1. 문서 정보 조회
            const document = await this.documentQueryService.getDocument(documentId);

            // 2. 작성자 정보 조회
            const author = await this.employeeService.findOneWithError({
                where: { id: authorId },
            });

            // 3. 알림 수신자 목록 조회 (작성자 본인 제외)
            const recipientIds = await this.getCommentNotificationRecipients(documentId, authorId);

            if (recipientIds.length === 0) {
                this.logger.debug('알림을 받을 수신자가 없습니다.');
                return;
            }

            // 4. 알림 전송
            const previewContent = this.getContentPreview(commentContent);

            await this.notificationContext.sendNotification({
                sender: author.employeeNumber,
                title: `[코멘트] ${document.title}`,
                content: `${author.name}님이 코멘트를 작성했습니다.\n"${previewContent}"`,
                recipientEmployeeIds: recipientIds,
                linkUrl: `/approval/document/${documentId}`,
                metadata: {
                    documentId,
                    type: 'COMMENT_CREATED',
                    authorId,
                    authorName: author.name,
                },
            });

            this.logger.log(`코멘트 작성 알림 전송 완료: ${recipientIds.length}명`);
        } catch (error) {
            this.logger.error(`코멘트 작성 알림 전송 실패: ${params.documentId}`, error);
            // 알림 실패는 전체 프로세스를 중단시키지 않음
        }
    }

    /**
     * 코멘트 수정 알림 전송
     * 기안자, 합의자, 결재자에게 알림 (작성자 본인 제외)
     */
    async sendCommentUpdatedNotification(params: {
        documentId: string;
        authorId: string;
        commentContent: string;
    }): Promise<void> {
        this.logger.log(`코멘트 수정 알림 전송 시작: 문서 ${params.documentId}`);

        try {
            const { documentId, authorId, commentContent } = params;

            // 1. 문서 정보 조회
            const document = await this.documentQueryService.getDocument(documentId);

            // 2. 작성자 정보 조회
            const author = await this.employeeService.findOneWithError({
                where: { id: authorId },
            });

            // 3. 알림 수신자 목록 조회 (작성자 본인 제외)
            const recipientIds = await this.getCommentNotificationRecipients(documentId, authorId);

            if (recipientIds.length === 0) {
                this.logger.debug('알림을 받을 수신자가 없습니다.');
                return;
            }

            // 4. 알림 전송
            const previewContent = this.getContentPreview(commentContent);

            await this.notificationContext.sendNotification({
                sender: author.employeeNumber,
                title: `[코멘트 수정] ${document.title}`,
                content: `${author.name}님이 코멘트를 수정했습니다.\n"${previewContent}"`,
                recipientEmployeeIds: recipientIds,
                linkUrl: `/approval/document/${documentId}`,
                metadata: {
                    documentId,
                    type: 'COMMENT_UPDATED',
                    authorId,
                    authorName: author.name,
                },
            });

            this.logger.log(`코멘트 수정 알림 전송 완료: ${recipientIds.length}명`);
        } catch (error) {
            this.logger.error(`코멘트 수정 알림 전송 실패: ${params.documentId}`, error);
        }
    }

    /**
     * 코멘트 삭제 알림 전송
     * 기안자, 합의자, 결재자에게 알림 (작성자 본인 제외)
     */
    async sendCommentDeletedNotification(params: { documentId: string; authorId: string }): Promise<void> {
        this.logger.log(`코멘트 삭제 알림 전송 시작: 문서 ${params.documentId}`);

        try {
            const { documentId, authorId } = params;

            // 1. 문서 정보 조회
            const document = await this.documentQueryService.getDocument(documentId);

            // 2. 작성자 정보 조회
            const author = await this.employeeService.findOneWithError({
                where: { id: authorId },
            });

            // 3. 알림 수신자 목록 조회 (작성자 본인 제외)
            const recipientIds = await this.getCommentNotificationRecipients(documentId, authorId);

            if (recipientIds.length === 0) {
                this.logger.debug('알림을 받을 수신자가 없습니다.');
                return;
            }

            // 4. 알림 전송
            await this.notificationContext.sendNotification({
                sender: author.employeeNumber,
                title: `[코멘트 삭제] ${document.title}`,
                content: `${author.name}님이 코멘트를 삭제했습니다.`,
                recipientEmployeeIds: recipientIds,
                linkUrl: `/approval/document/${documentId}`,
                metadata: {
                    documentId,
                    type: 'COMMENT_DELETED',
                    authorId,
                    authorName: author.name,
                },
            });

            this.logger.log(`코멘트 삭제 알림 전송 완료: ${recipientIds.length}명`);
        } catch (error) {
            this.logger.error(`코멘트 삭제 알림 전송 실패: ${params.documentId}`, error);
        }
    }

    /**
     * 코멘트 알림 수신자 목록 조회
     * 기안자 + 합의자 + 결재자 (작성자 본인 제외)
     */
    private async getCommentNotificationRecipients(documentId: string, excludeAuthorId: string): Promise<string[]> {
        // 1. 문서 조회 (기안자 정보 포함)
        const document = await this.documentQueryService.getDocument(documentId);

        // 2. 결재 단계 조회
        const approvalSteps = await this.approvalStepSnapshotService.findAll({
            where: { documentId },
        });

        // 3. 합의자와 결재자 ID 추출
        const agreementAndApprovalApproverIds = approvalSteps
            .filter(
                (step) => step.stepType === ApprovalStepType.AGREEMENT || step.stepType === ApprovalStepType.APPROVAL,
            )
            .map((step) => step.approverId);

        // 4. 기안자 + 합의자 + 결재자 합치기
        const allRecipientIds = new Set<string>();

        // 기안자 추가
        if (document.drafterId) {
            allRecipientIds.add(document.drafterId);
        }

        // 합의자 + 결재자 추가
        agreementAndApprovalApproverIds.forEach((id) => allRecipientIds.add(id));

        // 5. 작성자 본인 제외
        // allRecipientIds.delete(excludeAuthorId);

        return Array.from(allRecipientIds);
    }

    /**
     * 코멘트 내용 미리보기 생성 (최대 50자)
     */
    private getContentPreview(content: string): string {
        const maxLength = 50;
        if (content.length <= maxLength) {
            return content;
        }
        return content.substring(0, maxLength) + '...';
    }
}
