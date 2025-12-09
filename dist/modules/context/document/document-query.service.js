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
var DocumentQueryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentQueryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const document_entity_1 = require("../../domain/document/document.entity");
const document_service_1 = require("../../domain/document/document.service");
const approval_enum_1 = require("../../../common/enums/approval.enum");
const document_filter_builder_1 = require("./document-filter.builder");
let DocumentQueryService = DocumentQueryService_1 = class DocumentQueryService {
    constructor(dataSource, documentService, filterBuilder) {
        this.dataSource = dataSource;
        this.documentService = documentService;
        this.filterBuilder = filterBuilder;
        this.logger = new common_1.Logger(DocumentQueryService_1.name);
    }
    async getDocument(documentId, userId, queryRunner) {
        const document = await this.documentService.findOne({
            where: { id: documentId },
            relations: [
                'drafter',
                'drafter.departmentPositions',
                'drafter.departmentPositions.department',
                'drafter.departmentPositions.position',
                'approvalSteps',
            ],
            order: {
                approvalSteps: {
                    stepOrder: 'ASC',
                },
            },
            queryRunner,
        });
        if (!document) {
            throw new common_1.NotFoundException(`문서를 찾을 수 없습니다: ${documentId}`);
        }
        const drafterWithDeptPos = this.extractDrafterDepartmentPosition(document.drafter);
        if (userId) {
            const canCancelApproval = document.approvalSteps && document.approvalSteps.length > 0
                ? this.calculateCanCancelApproval(document.approvalSteps, document.status, userId)
                : false;
            const canCancelSubmit = this.calculateCanCancelSubmit(document.approvalSteps || [], document.status, document.drafterId, userId);
            return {
                ...document,
                drafter: drafterWithDeptPos,
                canCancelApproval,
                canCancelSubmit,
            };
        }
        return {
            ...document,
            drafter: drafterWithDeptPos,
            canCancelApproval: false,
            canCancelSubmit: false,
        };
    }
    calculateCanCancelApproval(approvalSteps, documentStatus, userId) {
        if (documentStatus !== approval_enum_1.DocumentStatus.PENDING) {
            return false;
        }
        const sortedSteps = [...approvalSteps].sort((a, b) => a.stepOrder - b.stepOrder);
        for (let i = 0; i < sortedSteps.length; i++) {
            const step = sortedSteps[i];
            if (step.approverId === userId && step.status === approval_enum_1.ApprovalStatus.APPROVED) {
                const nextStep = sortedSteps[i + 1];
                if (nextStep && nextStep.status === approval_enum_1.ApprovalStatus.PENDING) {
                    return true;
                }
            }
        }
        return false;
    }
    calculateCanCancelSubmit(approvalSteps, documentStatus, drafterId, userId) {
        if (documentStatus !== approval_enum_1.DocumentStatus.PENDING) {
            return false;
        }
        if (drafterId !== userId) {
            return false;
        }
        const hasAnyProcessed = approvalSteps.some((step) => step.status === approval_enum_1.ApprovalStatus.APPROVED || step.status === approval_enum_1.ApprovalStatus.REJECTED);
        return !hasAnyProcessed;
    }
    async getDocuments(filter, queryRunner) {
        const qb = queryRunner
            ? queryRunner.manager.getRepository(document_entity_1.Document).createQueryBuilder('document')
            : this.documentService.createQueryBuilder('document');
        qb.leftJoinAndSelect('document.drafter', 'drafter')
            .leftJoinAndSelect('document.approvalSteps', 'approvalSteps')
            .orderBy('document.createdAt', 'DESC')
            .addOrderBy('approvalSteps.stepOrder', 'ASC');
        if (filter.referenceUserId) {
            qb.andWhere(`document.id IN (
                    SELECT DISTINCT d.id
                    FROM documents d
                    INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
                    WHERE ass."stepType" = :referenceStepType
                    AND ass."approverId" = :referenceUserId
                    AND d.status != :draftStatus
                )`, {
                referenceStepType: approval_enum_1.ApprovalStepType.REFERENCE,
                referenceUserId: filter.referenceUserId,
                draftStatus: approval_enum_1.DocumentStatus.DRAFT,
            });
        }
        else if (filter.drafterId) {
            qb.andWhere('document.drafterId = :drafterId', { drafterId: filter.drafterId });
            if (filter.status) {
                qb.andWhere('document.status = :status', { status: filter.status });
            }
            if (filter.status === approval_enum_1.DocumentStatus.PENDING && filter.pendingStepType) {
                qb.andWhere(`document.id IN (
                        SELECT document_id
                        FROM (
                            SELECT DISTINCT ON (d.id)
                                d.id as document_id,
                                ass."stepType"
                            FROM documents d
                            INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
                            WHERE d.status = :pendingStatus
                            AND ass.status = :pendingStepStatus
                            AND d."drafterId" = :drafterId
                            ORDER BY d.id, ass."stepOrder" ASC
                        ) current_steps
                        WHERE "stepType" = :stepType
                    )`, {
                    pendingStatus: approval_enum_1.DocumentStatus.PENDING,
                    pendingStepStatus: approval_enum_1.ApprovalStatus.PENDING,
                    stepType: filter.pendingStepType,
                });
            }
        }
        if (filter.documentTemplateId) {
            qb.andWhere('document.documentTemplateId = :documentTemplateId', {
                documentTemplateId: filter.documentTemplateId,
            });
        }
        if (filter.categoryId) {
            qb.leftJoin('document_templates', 'template', 'document.documentTemplateId = template.id');
            qb.andWhere('template.categoryId = :categoryId', { categoryId: filter.categoryId });
        }
        if (filter.searchKeyword) {
            qb.andWhere('document.title LIKE :keyword', { keyword: `%${filter.searchKeyword}%` });
        }
        if (filter.startDate) {
            qb.andWhere('document.createdAt >= :startDate', { startDate: filter.startDate });
        }
        if (filter.endDate) {
            qb.andWhere('document.createdAt <= :endDate', { endDate: filter.endDate });
        }
        const page = filter.page || 1;
        const limit = filter.limit || 20;
        const skip = (page - 1) * limit;
        const totalItems = await qb.getCount();
        const documents = await qb.skip(skip).take(limit).getMany();
        const totalPages = Math.ceil(totalItems / limit);
        return {
            data: documents,
            meta: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }
    async getMyAllDocuments(params) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;
        const sortOrder = params.sortOrder || 'LATEST';
        const baseQb = this.documentService.createQueryBuilder('document');
        if (sortOrder === 'OLDEST') {
            baseQb.orderBy('document.createdAt', 'ASC');
        }
        else {
            baseQb.orderBy('document.createdAt', 'DESC');
        }
        this.filterBuilder.applyFilter(baseQb, params.filterType || 'ALL', params.userId, {
            receivedStepType: params.receivedStepType,
            drafterFilter: params.drafterFilter,
            referenceReadStatus: params.referenceReadStatus,
            pendingStatusFilter: params.pendingStatusFilter,
        });
        if (params.searchKeyword) {
            baseQb.leftJoin('document_templates', 'template', 'document.documentTemplateId = template.id');
            baseQb.andWhere('(document.title LIKE :keyword OR template.name LIKE :keyword)', {
                keyword: `%${params.searchKeyword}%`,
            });
        }
        if (params.startDate) {
            baseQb.andWhere('document.submittedAt >= :startDate', { startDate: params.startDate });
        }
        if (params.endDate) {
            baseQb.andWhere('document.submittedAt <= :endDate', { endDate: params.endDate });
        }
        const totalItems = await baseQb.getCount();
        const documentIds = await baseQb.clone().select('document.id').skip(skip).take(limit).getRawMany();
        this.logger.debug(`페이지네이션 적용: skip=${skip}, limit=${limit}, 조회된 ID 개수=${documentIds.length}, 전체=${totalItems}`);
        let documents = [];
        if (documentIds.length > 0) {
            const ids = documentIds.map((item) => item.document_id);
            const documentsMap = await this.documentService
                .createQueryBuilder('document')
                .leftJoinAndSelect('document.drafter', 'drafter')
                .leftJoinAndSelect('document.approvalSteps', 'approvalSteps')
                .whereInIds(ids)
                .addOrderBy('approvalSteps.stepOrder', 'ASC')
                .getMany();
            const templateIds = [...new Set(documentsMap.map((doc) => doc.documentTemplateId).filter(Boolean))];
            let templatesWithCategory = [];
            if (templateIds.length > 0) {
                const templateResults = await this.dataSource
                    .createQueryBuilder()
                    .select([
                    'dt.id as template_id',
                    'dt.name as template_name',
                    'dt.code as template_code',
                    'c.id as category_id',
                    'c.name as category_name',
                    'c.code as category_code',
                    'c.description as category_description',
                    'c.order as category_order',
                ])
                    .from('document_templates', 'dt')
                    .leftJoin('categories', 'c', 'dt.categoryId = c.id')
                    .where('dt.id IN (:...templateIds)', { templateIds })
                    .getRawMany();
                templatesWithCategory = templateResults.map((row) => ({
                    id: row.template_id,
                    name: row.template_name,
                    code: row.template_code,
                    category: row.category_id
                        ? {
                            id: row.category_id,
                            name: row.category_name,
                            code: row.category_code,
                            description: row.category_description,
                            order: row.category_order,
                        }
                        : undefined,
                }));
            }
            const templateMap = new Map(templatesWithCategory.map((t) => [t.id, t]));
            const documentsWithTemplate = documentsMap.map((doc) => {
                const canCancelApproval = doc.approvalSteps && doc.approvalSteps.length > 0
                    ? this.calculateCanCancelApproval(doc.approvalSteps, doc.status, params.userId)
                    : false;
                const canCancelSubmit = this.calculateCanCancelSubmit(doc.approvalSteps || [], doc.status, doc.drafterId, params.userId);
                return {
                    ...doc,
                    documentTemplate: doc.documentTemplateId ? templateMap.get(doc.documentTemplateId) : undefined,
                    canCancelApproval,
                    canCancelSubmit,
                };
            });
            const docMap = new Map(documentsWithTemplate.map((doc) => [doc.id, doc]));
            documents = ids.map((id) => docMap.get(id)).filter((doc) => doc !== undefined);
        }
        const totalPages = Math.ceil(totalItems / limit);
        return {
            data: documents,
            meta: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }
    async getMyDrafts(drafterId, page = 1, limit = 20, draftFilter) {
        const skip = (page - 1) * limit;
        const qb = this.documentService
            .createQueryBuilder('document')
            .leftJoinAndSelect('document.drafter', 'drafter')
            .leftJoinAndSelect('drafter.departmentPositions', 'drafterDepartmentPositions')
            .leftJoinAndSelect('drafterDepartmentPositions.department', 'drafterDepartment')
            .leftJoinAndSelect('drafterDepartmentPositions.position', 'drafterPosition')
            .leftJoinAndSelect('drafter.currentRank', 'drafterRank')
            .leftJoinAndSelect('document.approvalSteps', 'approvalSteps')
            .where('document.drafterId = :drafterId', { drafterId })
            .orderBy('document.createdAt', 'DESC')
            .addOrderBy('approvalSteps.stepOrder', 'ASC');
        if (draftFilter === 'DRAFT_ONLY') {
            qb.andWhere('document.status = :draftStatus', { draftStatus: approval_enum_1.DocumentStatus.DRAFT });
        }
        else if (draftFilter === 'EXCLUDE_DRAFT') {
            qb.andWhere('document.status != :draftStatus', { draftStatus: approval_enum_1.DocumentStatus.DRAFT });
        }
        const totalItems = await qb.getCount();
        const documents = await qb.skip(skip).take(limit).getMany();
        const mappedDocuments = documents.map((doc) => {
            if (doc.drafter && doc.drafter.departmentPositions && doc.drafter.departmentPositions.length > 0) {
                const currentDepartmentPosition = doc.drafter.departmentPositions.find((dp) => dp.isManager) || doc.drafter.departmentPositions[0];
                return {
                    ...doc,
                    drafter: {
                        id: doc.drafter.id,
                        employeeNumber: doc.drafter.employeeNumber,
                        name: doc.drafter.name,
                        email: doc.drafter.email,
                        department: currentDepartmentPosition.department
                            ? {
                                id: currentDepartmentPosition.department.id,
                                departmentName: currentDepartmentPosition.department.departmentName,
                                departmentCode: currentDepartmentPosition.department.departmentCode,
                            }
                            : undefined,
                        position: currentDepartmentPosition.position
                            ? {
                                id: currentDepartmentPosition.position.id,
                                positionTitle: currentDepartmentPosition.position.positionTitle,
                                positionCode: currentDepartmentPosition.position.positionCode,
                                level: currentDepartmentPosition.position.level,
                            }
                            : undefined,
                        rank: doc.drafter.currentRank
                            ? {
                                id: doc.drafter.currentRank.id,
                                rankTitle: doc.drafter.currentRank.rankTitle,
                                rankCode: doc.drafter.currentRank.rankCode,
                            }
                            : undefined,
                    },
                };
            }
            return doc;
        });
        const totalPages = Math.ceil(totalItems / limit);
        return {
            data: mappedDocuments,
            meta: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }
    async getDocumentStatistics(userId) {
        this.logger.debug(`문서 통계 조회: 사용자 ${userId}`);
        const myDocumentsStats = await this.dataSource.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = $1) as draft,
                COUNT(*) FILTER (WHERE "submittedAt" IS NOT NULL) as submitted,
                COUNT(*) FILTER (WHERE status = $2) as "pending",
                COUNT(*) FILTER (WHERE status = $3) as approved,
                COUNT(*) FILTER (WHERE status = $4) as rejected,
                COUNT(*) FILTER (WHERE status = $5) as implemented
            FROM documents
            WHERE "drafterId" = $6
            `, [
            approval_enum_1.DocumentStatus.DRAFT,
            approval_enum_1.DocumentStatus.PENDING,
            approval_enum_1.DocumentStatus.APPROVED,
            approval_enum_1.DocumentStatus.REJECTED,
            approval_enum_1.DocumentStatus.IMPLEMENTED,
            userId,
        ]);
        const pendingStepStats = await this.dataSource.query(`
            WITH current_steps AS (
                SELECT DISTINCT ON (d.id)
                    d.id as document_id,
                    ass."stepType"
                FROM documents d
                INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
                WHERE d."drafterId" = $1
                AND d.status = $2
                AND ass.status = $3
                ORDER BY d.id, ass."stepOrder" ASC
            )
            SELECT
                COUNT(*) FILTER (WHERE "stepType" = $4) as agreement,
                COUNT(*) FILTER (WHERE "stepType" = $5) as approval
            FROM current_steps
            `, [
            userId,
            approval_enum_1.DocumentStatus.PENDING,
            approval_enum_1.ApprovalStatus.PENDING,
            approval_enum_1.ApprovalStepType.AGREEMENT,
            approval_enum_1.ApprovalStepType.APPROVAL,
        ]);
        const referenceStats = await this.dataSource.query(`
            SELECT COUNT(DISTINCT d.id) as reference
            FROM documents d
            INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
            WHERE ass."stepType" = $1
            AND ass."approverId" = $2
            AND d.status != $3
            `, [approval_enum_1.ApprovalStepType.REFERENCE, userId, approval_enum_1.DocumentStatus.DRAFT]);
        const myStats = myDocumentsStats[0];
        const pendingStats = pendingStepStats[0];
        const refStats = referenceStats[0];
        return {
            myDocuments: {
                draft: parseInt(myStats.draft || '0'),
                submitted: parseInt(myStats.submitted || '0'),
                agreement: parseInt(pendingStats.agreement || '0'),
                approval: parseInt(pendingStats.approval || '0'),
                approved: parseInt(myStats.approved || '0'),
                rejected: parseInt(myStats.rejected || '0'),
                implemented: parseInt(myStats.implemented || '0'),
            },
            othersDocuments: {
                reference: parseInt(refStats.reference || '0'),
            },
        };
    }
    async getMyAllDocumentsStatistics(userId) {
        this.logger.debug(`내 전체 문서 통계 조회: 사용자 ${userId}`);
        const filterTypes = [
            'DRAFT',
            'RECEIVED',
            'PENDING',
            'PENDING_AGREEMENT',
            'PENDING_APPROVAL',
            'IMPLEMENTATION',
            'APPROVED',
            'REJECTED',
            'RECEIVED_REFERENCE',
        ];
        const statistics = {};
        for (const filterType of filterTypes) {
            const qb = this.documentService.createQueryBuilder('document');
            this.filterBuilder.applyFilter(qb, filterType, userId);
            const count = await qb.getCount();
            statistics[filterType] = count;
        }
        return statistics;
    }
    extractDrafterDepartmentPosition(drafter) {
        if (!drafter)
            return null;
        const currentDeptPos = drafter.departmentPositions?.find((dp) => dp.isManager) || drafter.departmentPositions?.[0];
        return {
            id: drafter.id,
            employeeNumber: drafter.employeeNumber,
            name: drafter.name,
            email: drafter.email || null,
            department: currentDeptPos?.department
                ? {
                    id: currentDeptPos.department.id,
                    departmentName: currentDeptPos.department.departmentName,
                    departmentCode: currentDeptPos.department.departmentCode,
                }
                : null,
            position: currentDeptPos?.position
                ? {
                    id: currentDeptPos.position.id,
                    positionTitle: currentDeptPos.position.positionTitle,
                    positionCode: currentDeptPos.position.positionCode,
                    level: currentDeptPos.position.level,
                }
                : null,
        };
    }
};
exports.DocumentQueryService = DocumentQueryService;
exports.DocumentQueryService = DocumentQueryService = DocumentQueryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        document_service_1.DomainDocumentService,
        document_filter_builder_1.DocumentFilterBuilder])
], DocumentQueryService);
//# sourceMappingURL=document-query.service.js.map