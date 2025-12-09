import { SelectQueryBuilder } from 'typeorm';
import { Document } from '../../domain/document/document.entity';
export declare class DocumentFilterBuilder {
    applyFilter(qb: SelectQueryBuilder<Document>, filterType: string, userId: string, options?: {
        receivedStepType?: string;
        drafterFilter?: string;
        referenceReadStatus?: string;
        pendingStatusFilter?: string;
        agreementStepStatus?: string;
    }): void;
    private applyDraftFilter;
    private applyPendingFilter;
    private applyReceivedFilter;
    private applyPendingAgreementFilter;
    private applyPendingApprovalFilter;
    private applyImplementationFilter;
    private applyApprovedFilter;
    private applyRejectedFilter;
    private applyReceivedReferenceFilter;
    private applyAllFilter;
}
