export declare enum MyAllDocumentFilterType {
    DRAFT = "DRAFT",
    RECEIVED = "RECEIVED",
    PENDING = "PENDING",
    PENDING_AGREEMENT = "PENDING_AGREEMENT",
    PENDING_APPROVAL = "PENDING_APPROVAL",
    IMPLEMENTATION = "IMPLEMENTATION",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    RECEIVED_REFERENCE = "RECEIVED_REFERENCE"
}
export declare enum ReceivedStepType {
    AGREEMENT = "AGREEMENT",
    APPROVAL = "APPROVAL"
}
export declare enum DrafterFilter {
    MY_DRAFT = "MY_DRAFT",
    PARTICIPATED = "PARTICIPATED"
}
export declare enum ReferenceReadStatus {
    READ = "READ",
    UNREAD = "UNREAD"
}
export declare enum PendingStatusFilter {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED",
    IMPLEMENTED = "IMPLEMENTED"
}
export declare enum AgreementStepStatus {
    SCHEDULED = "SCHEDULED",
    PENDING = "PENDING",
    COMPLETED = "COMPLETED"
}
export declare enum SortOrder {
    LATEST = "LATEST",
    OLDEST = "OLDEST"
}
export declare class QueryMyAllDocumentsDto {
    filterType?: MyAllDocumentFilterType;
    receivedStepType?: ReceivedStepType;
    drafterFilter?: DrafterFilter;
    referenceReadStatus?: ReferenceReadStatus;
    pendingStatusFilter?: PendingStatusFilter;
    agreementStepStatus?: AgreementStepStatus;
    searchKeyword?: string;
    startDate?: string;
    endDate?: string;
    sortOrder?: SortOrder;
    page?: number;
    limit?: number;
}
