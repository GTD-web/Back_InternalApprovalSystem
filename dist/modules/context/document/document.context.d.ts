import { DataSource, QueryRunner } from 'typeorm';
import { Document } from '../../domain/document/document.entity';
import { DomainDocumentService } from '../../domain/document/document.service';
import { DomainDocumentTemplateService } from '../../domain/document-template/document-template.service';
import { DomainEmployeeService } from '../../domain/employee/employee.service';
import { DomainApprovalStepSnapshotService } from '../../domain/approval-step-snapshot/approval-step-snapshot.service';
import { CreateDocumentDto, UpdateDocumentDto, SubmitDocumentDto, CancelSubmitDto } from './dtos/document.dto';
import { DocumentStatus } from '../../../common/enums/approval.enum';
import { DomainCommentService } from '../../domain/comment/comment.service';
export interface DocumentModificationHistoryItem {
    previousTitle: string;
    previousContent: string;
    modifiedAt: string;
    modificationComment: string;
    documentStatus: DocumentStatus;
}
export declare class DocumentContext {
    private readonly dataSource;
    private readonly documentService;
    private readonly documentTemplateService;
    private readonly employeeService;
    private readonly approvalStepSnapshotService;
    private readonly commentService;
    private readonly logger;
    constructor(dataSource: DataSource, documentService: DomainDocumentService, documentTemplateService: DomainDocumentTemplateService, employeeService: DomainEmployeeService, approvalStepSnapshotService: DomainApprovalStepSnapshotService, commentService: DomainCommentService);
    createDocument(dto: CreateDocumentDto, queryRunner?: QueryRunner): Promise<Document>;
    updateDocument(documentId: string, dto: UpdateDocumentDto, queryRunner?: QueryRunner): Promise<Document>;
    deleteDocument(documentId: string, externalQueryRunner?: QueryRunner): Promise<{
        deleted: boolean;
        documentId: string;
    }>;
    submitDocument(dto: SubmitDocumentDto, queryRunner?: QueryRunner): Promise<Document>;
    상신을취소한다(dto: CancelSubmitDto, queryRunner?: QueryRunner): Promise<Document>;
    private buildUpdatedMetadata;
    private generateDocumentNumber;
    createApprovalStepSnapshots(documentId: string, approvalSteps: CreateDocumentDto['approvalSteps'], queryRunner: QueryRunner): Promise<void>;
    updateApprovalStepSnapshots(documentId: string, approvalSteps: UpdateDocumentDto['approvalSteps'], queryRunner: QueryRunner): Promise<void>;
    validateAndProcessApprovalSteps(documentId: string, approvalSteps?: UpdateDocumentDto['approvalSteps'], queryRunner?: QueryRunner): Promise<void>;
    private buildApproverSnapshot;
}
