import { NotificationContext } from './notification.context';
import { DocumentQueryService } from '../document/document-query.service';
import { DomainApprovalStepSnapshotService } from '../../domain/approval-step-snapshot/approval-step-snapshot.service';
import { DomainEmployeeService } from '../../domain/employee/employee.service';
export declare class CommentNotificationService {
    private readonly notificationContext;
    private readonly documentQueryService;
    private readonly approvalStepSnapshotService;
    private readonly employeeService;
    private readonly logger;
    constructor(notificationContext: NotificationContext, documentQueryService: DocumentQueryService, approvalStepSnapshotService: DomainApprovalStepSnapshotService, employeeService: DomainEmployeeService);
    sendCommentCreatedNotification(params: {
        documentId: string;
        authorId: string;
        commentContent: string;
    }): Promise<void>;
    sendCommentUpdatedNotification(params: {
        documentId: string;
        authorId: string;
        commentContent: string;
    }): Promise<void>;
    sendCommentDeletedNotification(params: {
        documentId: string;
        authorId: string;
    }): Promise<void>;
    private getCommentNotificationRecipients;
    private getContentPreview;
}
