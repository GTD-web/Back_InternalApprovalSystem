import { DocumentService } from '../services/document.service';
export declare class DocumentPublicController {
    private readonly documentService;
    constructor(documentService: DocumentService);
    getDocument(documentId: string): Promise<{
        drafter: {
            id: string;
            employeeNumber: string;
            name: string;
            email: string;
            department: {
                id: string;
                departmentName: string;
                departmentCode: string;
            };
            position: {
                id: string;
                positionTitle: string;
                positionCode: string;
                level: number;
            };
        };
        documentTemplate: any;
        canCancelApproval: boolean;
        canCancelSubmit: boolean;
        id: string;
        documentNumber?: string;
        title: string;
        content: string;
        status: import("../../../../common/enums").DocumentStatus;
        comment?: string;
        metadata?: Record<string, any>;
        drafterId: string;
        documentTemplateId?: string;
        retentionPeriod?: string;
        retentionPeriodUnit?: string;
        retentionStartDate?: Date;
        retentionEndDate?: Date;
        submittedAt?: Date;
        cancelReason?: string;
        cancelledAt?: Date;
        approvedAt?: Date;
        rejectedAt?: Date;
        createdAt: Date;
        updatedAt: Date;
        approvalSteps: import("../../../domain").ApprovalStepSnapshot[];
        revisions: import("../../../domain").DocumentRevision[];
        comments: import("../../../domain").Comment[];
    }>;
}
