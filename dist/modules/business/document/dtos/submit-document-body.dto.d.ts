import { ApprovalStepSnapshotItemDto } from './approval-step-snapshot.dto';
export declare class SubmitDocumentBodyDto {
    documentTemplateId?: string;
    metadata?: Record<string, any>;
    approvalSteps?: ApprovalStepSnapshotItemDto[];
}
