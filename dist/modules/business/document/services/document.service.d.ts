import { DocumentContext } from '../../../context/document/document.context';
import { DocumentQueryService } from '../../../context/document/document-query.service';
import { TemplateContext } from '../../../context/template/template.context';
import { ApprovalProcessContext } from '../../../context/approval-process/approval-process.context';
import { NotificationContext } from '../../../context/notification/notification.context';
import { DocumentNotificationService } from '../../../context/notification/document-notification.service';
import { CommentNotificationService } from '../../../context/notification/comment-notification.service';
import { CommentContext } from '../../../context/comment/comment.context';
import { CreateDocumentDto, UpdateDocumentDto, SubmitDocumentDto, SubmitDocumentDirectDto, CreateTestDocumentDto } from '../dtos';
import { DocumentFilterDto } from '../../../context/document/dtos/document.dto';
import { DocumentStatus } from 'src/common/enums/approval.enum';
import { CreateCommentDto, UpdateCommentDto } from '../dtos/comment.dto';
import { DataSource } from 'typeorm';
import { ApproverMappingService } from 'src/modules/context/template/approver-mapping.service';
export declare class DocumentService {
    private readonly dataSource;
    private readonly documentContext;
    private readonly documentQueryService;
    private readonly templateContext;
    private readonly approverMappingService;
    private readonly approvalProcessContext;
    private readonly notificationContext;
    private readonly documentNotificationService;
    private readonly commentNotificationService;
    private readonly commentContext;
    private readonly logger;
    constructor(dataSource: DataSource, documentContext: DocumentContext, documentQueryService: DocumentQueryService, templateContext: TemplateContext, approverMappingService: ApproverMappingService, approvalProcessContext: ApprovalProcessContext, notificationContext: NotificationContext, documentNotificationService: DocumentNotificationService, commentNotificationService: CommentNotificationService, commentContext: CommentContext);
    createDocument(dto: CreateDocumentDto, drafterId: string): Promise<import("../../../domain").Document>;
    updateDocument(documentId: string, dto: UpdateDocumentDto): Promise<import("../../../domain").Document>;
    deleteDocument(documentId: string): Promise<{
        deleted: boolean;
        documentId: string;
    }>;
    getDocument(documentId: string, userId?: string): Promise<{
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
    getDocuments(filter: DocumentFilterDto): Promise<{
        data: import("../../../domain").Document[];
        meta: {
            currentPage: number;
            itemsPerPage: number;
            totalItems: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    submitDocument(dto: SubmitDocumentDto): Promise<import("../../../domain").Document>;
    submitDocumentDirect(dto: SubmitDocumentDirectDto, drafterId: string): Promise<import("../../../domain").Document>;
    cancelSubmit(documentId: string, drafterId: string, reason: string): Promise<import("../../../domain").Document>;
    private sendSubmitNotification;
    getTemplateForNewDocument(templateId: string, drafterId: string): Promise<import("../dtos").DocumentTemplateWithApproversResponseDto>;
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
    getMyAllDocumentsStatistics(userId: string): Promise<Record<string, number>>;
    getMyAllDocuments(params: {
        userId: string;
        filterType?: string;
        receivedStepType?: string;
        drafterFilter?: string;
        referenceReadStatus?: string;
        pendingStatusFilter?: string;
        agreementStepStatus?: string;
        searchKeyword?: string;
        startDate?: Date;
        endDate?: Date;
        sortOrder?: string;
        page?: number;
        limit?: number;
    }): Promise<{
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
    getMyDrafts(drafterId: string, page: number, limit: number, draftFilter?: 'DRAFT_ONLY' | 'EXCLUDE_DRAFT'): Promise<{
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
    createComment(documentId: string, dto: CreateCommentDto, authorId: string): Promise<import("../../../domain").Comment>;
    updateComment(commentId: string, dto: UpdateCommentDto, authorId: string): Promise<import("../../../domain").Comment>;
    deleteComment(commentId: string, authorId: string): Promise<import("../../../domain").Comment>;
    getDocumentComments(documentId: string): Promise<import("../../../domain").Comment[]>;
    getComment(commentId: string): Promise<import("../../../domain").Comment>;
    createTestDocument(dto: CreateTestDocumentDto): Promise<{
        documentId: string;
        documentNumber: string;
        title: string;
        status: DocumentStatus;
        approvalStepsCount: number;
        message: string;
    }>;
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
}
