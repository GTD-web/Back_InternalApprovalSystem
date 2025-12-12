"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainDocumentService = void 0;
const common_1 = require("@nestjs/common");
const document_repository_1 = require("./document.repository");
const base_service_1 = require("../../../common/services/base.service");
const document_entity_1 = require("./document.entity");
let DomainDocumentService = class DomainDocumentService extends base_service_1.BaseService {
    constructor(documentRepository) {
        super(documentRepository);
        this.documentRepository = documentRepository;
    }
    async createDocument(dto, queryRunner) {
        const document = new document_entity_1.Document();
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
        document.임시저장한다();
        return await this.documentRepository.save(document, { queryRunner });
    }
    async updateDocument(document, dto, queryRunner) {
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
    async submitDocument(document, documentNumber, metadata, documentTemplateId, queryRunner) {
        document.문서번호를설정한다(documentNumber);
        if (documentTemplateId) {
            document.문서템플릿을설정한다(documentTemplateId);
        }
        if (metadata) {
            document.메타데이터를설정한다(metadata);
        }
        document.상신한다();
        return await this.documentRepository.save(document, { queryRunner });
    }
};
exports.DomainDocumentService = DomainDocumentService;
exports.DomainDocumentService = DomainDocumentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [document_repository_1.DomainDocumentRepository])
], DomainDocumentService);
//# sourceMappingURL=document.service.js.map