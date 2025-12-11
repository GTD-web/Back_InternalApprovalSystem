import { UpdateApprovalStepSnapshotItemDto } from './update-approval-step-snapshot.dto';
export declare class UpdateDocumentDto {
    title?: string;
    content?: string;
    metadata?: Record<string, any>;
    comment?: string;
    approvalSteps?: UpdateApprovalStepSnapshotItemDto[];
}
