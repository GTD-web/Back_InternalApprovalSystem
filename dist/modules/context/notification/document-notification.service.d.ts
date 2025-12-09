import { NotificationContext } from './notification.context';
import { ApprovalStepType, ApprovalStatus, DocumentStatus } from '../../../common/enums/approval.enum';
export declare class DocumentNotificationService {
    private readonly notificationContext;
    private readonly logger;
    constructor(notificationContext: NotificationContext);
    sendNotificationAfterSubmit(params: {
        document: DocumentInfo;
        allSteps: ApprovalStepInfo[];
        drafterEmployeeNumber: string;
    }): Promise<void>;
    sendNotificationAfterCompleteAgreement(params: {
        document: DocumentInfo;
        allSteps: ApprovalStepInfo[];
        agreerEmployeeNumber: string;
    }): Promise<void>;
    sendNotificationAfterApprove(params: {
        document: DocumentInfo;
        allSteps: ApprovalStepInfo[];
        currentStepId: string;
        approverEmployeeNumber: string;
    }): Promise<void>;
    sendNotificationAfterReject(params: {
        document: DocumentInfo;
        rejectReason: string;
        rejecterEmployeeNumber: string;
    }): Promise<void>;
    sendNotificationAfterCompleteImplementation(params: {
        document: DocumentInfo;
        allSteps: ApprovalStepInfo[];
        implementerEmployeeNumber: string;
    }): Promise<void>;
    private sendApprovalStepNotifications;
    private sendReferenceNotifications;
    private sendDrafterNotification;
    private getDrafterNotificationMessage;
    private findNextPendingStep;
    getStepTypeText(stepType: ApprovalStepType): string;
}
export interface DocumentInfo {
    id: string;
    title: string;
    drafterId: string;
    drafterName?: string;
    status?: DocumentStatus;
}
export interface ApprovalStepInfo {
    id: string;
    stepOrder: number;
    stepType: ApprovalStepType;
    approverId: string;
    status: ApprovalStatus;
}
