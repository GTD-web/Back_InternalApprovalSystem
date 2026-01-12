import { DataSource, QueryRunner } from 'typeorm';
import { DomainApprovalStepSnapshotService } from '../../domain/approval-step-snapshot/approval-step-snapshot.service';
import { DomainDocumentService } from '../../domain/document/document.service';
import { DomainCommentService } from '../../domain/comment/comment.service';
import { ApprovalStepSnapshot } from '../../domain/approval-step-snapshot/approval-step-snapshot.entity';
import { ApproveStepDto, RejectStepDto, CompleteAgreementDto, CompleteImplementationDto, CancelApprovalStepDto, CancelApprovalStepResultDto } from './dtos/approval-action.dto';
import { ApprovalStatus, ApprovalStepType, DocumentStatus } from '../../../common/enums/approval.enum';
export declare class ApprovalProcessContext {
    private readonly dataSource;
    private readonly approvalStepSnapshotService;
    private readonly documentService;
    private readonly commentService;
    private readonly logger;
    constructor(dataSource: DataSource, approvalStepSnapshotService: DomainApprovalStepSnapshotService, documentService: DomainDocumentService, commentService: DomainCommentService);
    testApproveStep(stepSnapshotId: string, queryRunner?: QueryRunner): Promise<ApprovalStepSnapshot>;
    completeAgreement(dto: CompleteAgreementDto, queryRunner?: QueryRunner): Promise<ApprovalStepSnapshot>;
    markReferenceRead(dto: {
        stepSnapshotId: string;
        referenceUserId: string;
        comment?: string;
    }, queryRunner?: QueryRunner): Promise<ApprovalStepSnapshot>;
    approveStep(dto: ApproveStepDto, queryRunner?: QueryRunner): Promise<ApprovalStepSnapshot>;
    completeImplementation(dto: CompleteImplementationDto, queryRunner?: QueryRunner): Promise<ApprovalStepSnapshot>;
    rejectStep(dto: RejectStepDto, queryRunner?: QueryRunner): Promise<ApprovalStepSnapshot>;
    결재를취소한다(dto: CancelApprovalStepDto, queryRunner?: QueryRunner): Promise<CancelApprovalStepResultDto>;
    getMyPendingApprovals(userId: string, type: 'SUBMITTED' | 'AGREEMENT' | 'APPROVAL', page?: number, limit?: number, queryRunner?: QueryRunner): Promise<{
        data: {
            documentId: string;
            documentNumber: string;
            title: string;
            status: DocumentStatus;
            drafterId: string;
            drafterName: string;
            drafterDepartmentName: any;
            currentStep: {
                id: string;
                stepOrder: number;
                stepType: ApprovalStepType;
                status: ApprovalStatus;
                approverId: string;
                approverSnapshot: import("../../domain/approval-step-snapshot/approval-step-snapshot.entity").ApproverSnapshotMetadata;
            };
            approvalSteps: {
                id: string;
                stepOrder: number;
                stepType: ApprovalStepType;
                status: ApprovalStatus;
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
    getApprovalSteps(documentId: string, queryRunner?: QueryRunner): Promise<ApprovalStepSnapshot[]>;
    getApprovalStepsByDocumentId(documentId: string, queryRunner?: QueryRunner): Promise<ApprovalStepSnapshot[]>;
    private checkAndUpdateDocumentStatus;
    private validateApprovalOrder;
    autoApproveIfDrafterIsFirstApprover(documentId: string, drafterId: string, queryRunner?: QueryRunner): Promise<void>;
    private canProcessStepOptimized;
    private canProcessStep;
}
