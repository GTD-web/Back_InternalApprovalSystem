import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainDocumentRepository } from './document.repository';
import { BaseService } from '../../../common/services/base.service';
import { Document } from './document.entity';
import { IRepositoryOptions } from '../../../common/interfaces/repository.interface';
import { DeepPartial, QueryRunner } from 'typeorm';

@Injectable()
export class DomainDocumentService extends BaseService<Document> {
    constructor(private readonly documentRepository: DomainDocumentRepository) {
        super(documentRepository);
    }

    async createDocument(dto: DeepPartial<Document>, queryRunner?: QueryRunner): Promise<Document> {
        const document = new Document();

        if (dto.title) {
            document.제목을설정한다(dto.title);
        }
        if (dto.content) {
            document.내용을설정한다(dto.content);
        }
        if (dto.drafterId) {
            document.기안자를설정한다(dto.drafterId);
        }
        if (dto.documentTemplateId) {
            document.문서템플릿을설정한다(dto.documentTemplateId);
        }
        if (dto.metadata) {
            document.메타데이터를설정한다(dto.metadata);
        }
        if (dto.comment) {
            document.비고를설정한다(dto.comment);
        }
        // if (dto.retentionPeriod) {
        //     document.보존연한을설정한다(dto.retentionPeriod);
        // }
        // if (dto.retentionPeriodUnit) {
        //     document.보존연한단위를설정한다(dto.retentionPeriodUnit);
        // }
        // if (dto.retentionStartDate) {
        //     document.보존연한시작일을설정한다(dto.retentionStartDate as Date);
        // }
        // if (dto.retentionEndDate) {
        //     document.보존연한종료일을설정한다(dto.retentionEndDate as Date);
        // }
        document.임시저장한다();

        return await this.documentRepository.save(document, { queryRunner });
    }

    async updateDocument(document: Document, dto: DeepPartial<Document>, queryRunner?: QueryRunner): Promise<Document> {
        if (dto.title) {
            document.제목을설정한다(dto.title);
        }
        if (dto.content) {
            document.내용을설정한다(dto.content);
        }
        if (dto.drafterId) {
            document.기안자를설정한다(dto.drafterId);
        }
        if (dto.documentTemplateId) {
            document.문서템플릿을설정한다(dto.documentTemplateId);
        }
        if (dto.metadata) {
            document.메타데이터를설정한다(dto.metadata);
        }
        if (dto.comment) {
            document.비고를설정한다(dto.comment);
        }
        return await this.documentRepository.save(document, { queryRunner });
    }

    /**
     * 문서 기안 처리
     * @param document 기안할 문서
     * @param documentNumber 생성된 문서 번호
     * @param documentTemplateId 문서 템플릿 ID (선택)
     * @param queryRunner 트랜잭션 Query Runner
     */
    async submitDocument(
        document: Document,
        documentNumber: string,
        metadata?: Record<string, any>,
        documentTemplateId?: string,
        queryRunner?: QueryRunner,
    ): Promise<Document> {
        // 문서 번호 설정
        document.문서번호를설정한다(documentNumber);

        // 템플릿 ID 설정 (있는 경우)
        if (documentTemplateId) {
            document.문서템플릿을설정한다(documentTemplateId);
        }

        // 메타데이터 설정 (있는 경우)
        if (metadata) {
            document.메타데이터를설정한다(metadata);
        }

        // 상신 처리 (상태 변경 + submittedAt 설정)
        document.상신한다();

        return await this.documentRepository.save(document, { queryRunner });
    }
}
