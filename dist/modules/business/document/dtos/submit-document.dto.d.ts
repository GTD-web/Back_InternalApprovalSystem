import { ApprovalStepSnapshotItemDto } from './approval-step-snapshot.dto';
export declare class SubmitDocumentDto {
    documentId: string;
    documentTemplateId?: string;
    metadata?: Record<string, any>;
    approvalSteps?: ApprovalStepSnapshotItemDto[];
}
