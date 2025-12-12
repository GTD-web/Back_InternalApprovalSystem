import { DocumentStatus, ApprovalStepType } from '../../../../common/enums/approval.enum';
export declare class ApprovalStepSnapshotItemDto {
    stepOrder: number;
    stepType: ApprovalStepType;
    approverId: string;
    id?: string;
}
export declare class PaginationOptionsDto {
    page: number;
    limit: number;
}
export declare class CreateDocumentDto {
    documentTemplateId?: string;
    title: string;
    content: string;
    drafterId: string;
    metadata?: Record<string, any>;
    approvalSteps?: ApprovalStepSnapshotItemDto[];
}
export declare class UpdateDocumentDto {
    title?: string;
    content?: string;
    metadata?: Record<string, any>;
    comment?: string;
    status?: DocumentStatus;
    approvalSteps?: ApprovalStepSnapshotItemDto[];
}
export declare class SubmitDocumentDto {
    documentId: string;
    documentTemplateId?: string;
    metadata?: Record<string, any>;
    approvalSteps?: ApprovalStepSnapshotItemDto[];
}
export declare class CancelSubmitDto {
    documentId: string;
    drafterId: string;
    reason: string;
}
export declare class DocumentFilterDto {
    status?: DocumentStatus;
    pendingStepType?: ApprovalStepType;
    drafterId?: string;
    referenceUserId?: string;
    categoryId?: string;
    documentTemplateId?: string;
    startDate?: Date;
    endDate?: Date;
    searchKeyword?: string;
    page?: number;
    limit?: number;
}
