import { DomainDocumentRepository } from './document.repository';
import { BaseService } from '../../../common/services/base.service';
import { Document } from './document.entity';
import { DeepPartial, QueryRunner } from 'typeorm';
export declare class DomainDocumentService extends BaseService<Document> {
    private readonly documentRepository;
    constructor(documentRepository: DomainDocumentRepository);
    createDocument(dto: DeepPartial<Document>, queryRunner?: QueryRunner): Promise<Document>;
    updateDocument(document: Document, dto: DeepPartial<Document>, queryRunner?: QueryRunner): Promise<Document>;
    submitDocument(document: Document, documentNumber: string, metadata?: Record<string, any>, documentTemplateId?: string, queryRunner?: QueryRunner): Promise<Document>;
}
