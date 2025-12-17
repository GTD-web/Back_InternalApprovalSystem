import { DocumentService } from '../services/document.service';
import { CreateDocumentDto, UpdateDocumentDto, SubmitDocumentBodyDto, SubmitDocumentDirectDto, DocumentTemplateWithApproversResponseDto, QueryMyAllDocumentsDto, CancelSubmitDto, CreateTestDocumentQueryDto } from '../dtos';
import { CreateCommentDto, UpdateCommentDto } from '../dtos/comment.dto';
import { DocumentStatus } from '../../../../common/enums/approval.enum';
import { Employee } from '../../../domain/employee/employee.entity';
export declare class DocumentController {
    private readonly documentService;
    constructor(documentService: DocumentService);
    createDocument(user: Employee, dto: CreateDocumentDto): Promise<import("../../../domain").Document>;
    getMyAllDocumentsStatistics(user: Employee): Promise<Record<string, number>>;
    getMyAllDocuments(user: Employee, query: QueryMyAllDocumentsDto): Promise<{
        data: any[];
        meta: {
            currentPage: number;
            itemsPerPage: number;
            totalItems: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    getMyDrafts(user: Employee, draftFilter?: 'DRAFT_ONLY' | 'EXCLUDE_DRAFT', page?: number, limit?: number): Promise<{
        data: (import("../../../domain").Document | {
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
                rank: {
                    id: string;
                    rankTitle: string;
                    rankCode: string;
                };
            };
            id: string;
            documentNumber?: string;
            title: string;
            content: string;
            status: DocumentStatus;
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
        })[];
        meta: {
            currentPage: number;
            itemsPerPage: number;
            totalItems: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    getDocument(user: Employee, documentId: string): Promise<{
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
        status: DocumentStatus;
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
    updateDocument(user: Employee, documentId: string, dto: UpdateDocumentDto): Promise<import("../../../domain").Document>;
    deleteDocument(documentId: string): Promise<void>;
    submitDocument(documentId: string, dto: SubmitDocumentBodyDto): Promise<import("../../../domain").Document>;
    cancelSubmit(user: Employee, documentId: string, dto: CancelSubmitDto): Promise<import("../../../domain").Document>;
    submitDocumentDirect(user: Employee, dto: SubmitDocumentDirectDto): Promise<import("../../../domain").Document>;
    getTemplateForNewDocument(templateId: string, user: Employee): Promise<DocumentTemplateWithApproversResponseDto>;
    getDocumentStatistics(userId: string): Promise<{
        myDocuments: {
            draft: number;
            submitted: number;
            agreement: number;
            approval: number;
            approved: number;
            rejected: number;
            implemented: number;
        };
        othersDocuments: {
            reference: number;
        };
    }>;
    createComment(documentId: string, user: Employee, dto: CreateCommentDto): Promise<import("../../../domain").Comment>;
    getDocumentComments(documentId: string): Promise<import("../../../domain").Comment[]>;
    updateComment(commentId: string, user: Employee, dto: UpdateCommentDto): Promise<import("../../../domain").Comment>;
    deleteComment(commentId: string, user: Employee): Promise<void>;
    getComment(commentId: string): Promise<import("../../../domain").Comment>;
    deleteAllDocuments(): Promise<{
        deletedApprovalStepSnapshots: number;
        deletedComments: number;
        deletedDocumentRevisions: number;
        deletedDocuments: number;
        deletedApprovalStepTemplates: number;
        deletedDocumentTemplates: number;
        deletedCategories: number;
        createdCategories: number;
        categories: {
            name: string;
            code: string;
        }[];
        message: string;
    }>;
    createTestDocument(query: CreateTestDocumentQueryDto): Promise<{
        documentId: string;
        documentNumber: string;
        title: string;
        status: DocumentStatus;
        approvalStepsCount: number;
        message: string;
    }>;
}
