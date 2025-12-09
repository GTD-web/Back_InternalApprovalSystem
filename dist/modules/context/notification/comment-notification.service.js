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
var CommentNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentNotificationService = void 0;
const common_1 = require("@nestjs/common");
const notification_context_1 = require("./notification.context");
const document_query_service_1 = require("../document/document-query.service");
const approval_step_snapshot_service_1 = require("../../domain/approval-step-snapshot/approval-step-snapshot.service");
const employee_service_1 = require("../../domain/employee/employee.service");
const approval_enum_1 = require("../../../common/enums/approval.enum");
let CommentNotificationService = CommentNotificationService_1 = class CommentNotificationService {
    constructor(notificationContext, documentQueryService, approvalStepSnapshotService, employeeService) {
        this.notificationContext = notificationContext;
        this.documentQueryService = documentQueryService;
        this.approvalStepSnapshotService = approvalStepSnapshotService;
        this.employeeService = employeeService;
        this.logger = new common_1.Logger(CommentNotificationService_1.name);
    }
    async sendCommentCreatedNotification(params) {
        this.logger.log(`코멘트 작성 알림 전송 시작: 문서 ${params.documentId}`);
        try {
            const { documentId, authorId, commentContent } = params;
            const document = await this.documentQueryService.getDocument(documentId);
            const author = await this.employeeService.findOneWithError({
                where: { id: authorId },
            });
            const recipientIds = await this.getCommentNotificationRecipients(documentId, authorId);
            if (recipientIds.length === 0) {
                this.logger.debug('알림을 받을 수신자가 없습니다.');
                return;
            }
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
        }
        catch (error) {
            this.logger.error(`코멘트 작성 알림 전송 실패: ${params.documentId}`, error);
        }
    }
    async sendCommentUpdatedNotification(params) {
        this.logger.log(`코멘트 수정 알림 전송 시작: 문서 ${params.documentId}`);
        try {
            const { documentId, authorId, commentContent } = params;
            const document = await this.documentQueryService.getDocument(documentId);
            const author = await this.employeeService.findOneWithError({
                where: { id: authorId },
            });
            const recipientIds = await this.getCommentNotificationRecipients(documentId, authorId);
            if (recipientIds.length === 0) {
                this.logger.debug('알림을 받을 수신자가 없습니다.');
                return;
            }
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
        }
        catch (error) {
            this.logger.error(`코멘트 수정 알림 전송 실패: ${params.documentId}`, error);
        }
    }
    async sendCommentDeletedNotification(params) {
        this.logger.log(`코멘트 삭제 알림 전송 시작: 문서 ${params.documentId}`);
        try {
            const { documentId, authorId } = params;
            const document = await this.documentQueryService.getDocument(documentId);
            const author = await this.employeeService.findOneWithError({
                where: { id: authorId },
            });
            const recipientIds = await this.getCommentNotificationRecipients(documentId, authorId);
            if (recipientIds.length === 0) {
                this.logger.debug('알림을 받을 수신자가 없습니다.');
                return;
            }
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
        }
        catch (error) {
            this.logger.error(`코멘트 삭제 알림 전송 실패: ${params.documentId}`, error);
        }
    }
    async getCommentNotificationRecipients(documentId, excludeAuthorId) {
        const document = await this.documentQueryService.getDocument(documentId);
        const approvalSteps = await this.approvalStepSnapshotService.findAll({
            where: { documentId },
        });
        const agreementAndApprovalApproverIds = approvalSteps
            .filter((step) => step.stepType === approval_enum_1.ApprovalStepType.AGREEMENT || step.stepType === approval_enum_1.ApprovalStepType.APPROVAL)
            .map((step) => step.approverId);
        const allRecipientIds = new Set();
        if (document.drafterId) {
            allRecipientIds.add(document.drafterId);
        }
        agreementAndApprovalApproverIds.forEach((id) => allRecipientIds.add(id));
        return Array.from(allRecipientIds);
    }
    getContentPreview(content) {
        const maxLength = 50;
        if (content.length <= maxLength) {
            return content;
        }
        return content.substring(0, maxLength) + '...';
    }
};
exports.CommentNotificationService = CommentNotificationService;
exports.CommentNotificationService = CommentNotificationService = CommentNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notification_context_1.NotificationContext,
        document_query_service_1.DocumentQueryService,
        approval_step_snapshot_service_1.DomainApprovalStepSnapshotService,
        employee_service_1.DomainEmployeeService])
], CommentNotificationService);
//# sourceMappingURL=comment-notification.service.js.map