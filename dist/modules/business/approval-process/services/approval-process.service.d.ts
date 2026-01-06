import { DataSource } from 'typeorm';
import { ApprovalProcessContext } from '../../../context/approval-process/approval-process.context';
import { DocumentContext } from '../../../context/document/document.context';
import { DocumentQueryService } from '../../../context/document/document-query.service';
import { DocumentNotificationService } from '../../../context/notification/document-notification.service';
import { ApproveStepDto, RejectStepDto, CompleteAgreementDto, CompleteImplementationDto, CancelApprovalStepDto, ProcessApprovalActionDto } from '../dtos';
export declare class ApprovalProcessService {
    private readonly dataSource;
    private readonly approvalProcessContext;
    private readonly documentContext;
    private readonly documentQueryService;
    private readonly documentNotificationService;
    private readonly logger;
    constructor(dataSource: DataSource, approvalProcessContext: ApprovalProcessContext, documentContext: DocumentContext, documentQueryService: DocumentQueryService, documentNotificationService: DocumentNotificationService);
    approveStep(dto: ApproveStepDto, approverId: string): Promise<import("../../../domain").ApprovalStepSnapshot>;
    rejectStep(dto: RejectStepDto, rejecterId: string): Promise<import("../../../domain").ApprovalStepSnapshot>;
    completeAgreement(dto: CompleteAgreementDto, agreerId: string): Promise<import("../../../domain").ApprovalStepSnapshot>;
    completeImplementation(dto: CompleteImplementationDto, implementerId: string): Promise<import("../../../domain").ApprovalStepSnapshot>;
    markReferenceRead(dto: {
        stepSnapshotId: string;
        comment?: string;
    }, referenceUserId: string): Promise<import("../../../domain").ApprovalStepSnapshot>;
    cancelApprovalStep(dto: CancelApprovalStepDto, approverId: string): Promise<import("../../../context/approval-process/dtos/approval-action.dto").CancelApprovalStepResultDto>;
    getMyPendingApprovals(userId: string, type: 'SUBMITTED' | 'AGREEMENT' | 'APPROVAL', page: number, limit: number): Promise<{
        data: {
            documentId: string;
            documentNumber: string;
            title: string;
            status: import("../../../../common/enums").DocumentStatus;
            drafterId: string;
            drafterName: string;
            drafterDepartmentName: any;
            currentStep: {
                id: string;
                stepOrder: number;
                stepType: import("../../../../common/enums").ApprovalStepType;
                status: import("../../../../common/enums").ApprovalStatus;
                approverId: string;
                approverSnapshot: import("../../../domain/approval-step-snapshot/approval-step-snapshot.entity").ApproverSnapshotMetadata;
            };
            approvalSteps: {
                id: string;
                stepOrder: number;
                stepType: import("../../../../common/enums").ApprovalStepType;
                status: import("../../../../common/enums").ApprovalStatus;
                approverId: string;
                approverName: string;
                comment: string;
                approvedAt: Date;
            }[];
            submittedAt: Date;
            createdAt: Date;
        }[];
        meta: {
            currentPage: number;
            itemsPerPage: number;
            totalItems: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    getApprovalSteps(documentId: string): Promise<import("../../../domain").ApprovalStepSnapshot[]>;
    processApprovalAction(dto: ProcessApprovalActionDto): Promise<import("../../../domain").ApprovalStepSnapshot>;
    private sendApproveNotification;
    private sendRejectNotification;
    private sendCompleteAgreementNotification;
    private sendCompleteImplementationNotification;
}
