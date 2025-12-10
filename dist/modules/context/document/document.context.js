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
var DocumentContext_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentContext = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const document_service_1 = require("../../domain/document/document.service");
const document_template_service_1 = require("../../domain/document-template/document-template.service");
const employee_service_1 = require("../../domain/employee/employee.service");
const approval_step_snapshot_service_1 = require("../../domain/approval-step-snapshot/approval-step-snapshot.service");
const approval_enum_1 = require("../../../common/enums/approval.enum");
const transaction_util_1 = require("../../../common/utils/transaction.util");
const document_policy_validator_1 = require("../../../common/utils/document-policy.validator");
const comment_service_1 = require("../../domain/comment/comment.service");
let DocumentContext = DocumentContext_1 = class DocumentContext {
    constructor(dataSource, documentService, documentTemplateService, employeeService, approvalStepSnapshotService, commentService) {
        this.dataSource = dataSource;
        this.documentService = documentService;
        this.documentTemplateService = documentTemplateService;
        this.employeeService = employeeService;
        this.approvalStepSnapshotService = approvalStepSnapshotService;
        this.commentService = commentService;
        this.logger = new common_1.Logger(DocumentContext_1.name);
    }
    async createDocument(dto, queryRunner) {
        this.logger.log(`문서 생성 시작: ${dto.title}`);
        if (dto.documentTemplateId) {
            await this.documentTemplateService.findOneWithError({
                where: { id: dto.documentTemplateId },
            });
        }
        await this.employeeService.findOneWithError({
            where: { id: dto.drafterId },
        });
        const documentDto = {
            title: dto.title,
            content: dto.content,
            drafterId: dto.drafterId,
            documentTemplateId: dto.documentTemplateId,
            metadata: dto.metadata,
        };
        const document = await this.documentService.createDocument(documentDto, queryRunner);
        return document;
    }
    async updateDocument(documentId, dto, queryRunner) {
        this.logger.log(`문서 수정 시작: ${documentId}`);
        const document = await this.documentService.findOneWithError({
            where: { id: documentId },
            queryRunner,
        });
        const isTitleOrContentUpdated = dto.title !== undefined || dto.content !== undefined;
        let updatedMetadata = document.metadata;
        if (isTitleOrContentUpdated) {
            updatedMetadata = this.buildUpdatedMetadata(document, dto);
        }
        const updatedDocument = await this.documentService.updateDocument(document, {
            title: dto.title,
            content: dto.content,
            comment: dto.comment,
            metadata: updatedMetadata,
        }, queryRunner);
        if (dto.approvalSteps !== undefined) {
            await this.updateApprovalStepSnapshots(documentId, dto.approvalSteps, queryRunner);
        }
        this.logger.log(`문서 수정 완료: ${documentId}`);
        return updatedDocument;
    }
    async deleteDocument(documentId, externalQueryRunner) {
        this.logger.log(`문서 삭제 시작: ${documentId}`);
        return await (0, transaction_util_1.withTransaction)(this.dataSource, async (queryRunner) => {
            await this.documentService.findOneWithError({
                where: { id: documentId },
                queryRunner,
            });
            await this.documentService.delete(documentId, { queryRunner });
            this.logger.log(`문서 삭제 완료: ${documentId}`);
            return { deleted: true, documentId };
        }, externalQueryRunner);
    }
    async submitDocument(dto, queryRunner) {
        this.logger.log(`문서 기안 시작: ${dto.documentId}`);
        const document = await this.documentService.findOneWithError({
            where: { id: dto.documentId },
            queryRunner,
        });
        await this.validateAndProcessApprovalSteps(dto.documentId, dto.approvalSteps, queryRunner);
        const documentTemplateId = dto.documentTemplateId || document.documentTemplateId || null;
        if (documentTemplateId) {
            await this.documentTemplateService.findOneWithError({
                where: { id: documentTemplateId },
                queryRunner,
            });
        }
        const documentNumber = await this.generateDocumentNumber(documentTemplateId, queryRunner);
        const submittedDocument = await this.documentService.submitDocument(document, documentNumber, documentTemplateId || undefined, queryRunner);
        this.logger.log(`문서 기안 완료: ${dto.documentId}, 문서번호: ${documentNumber}`);
        return submittedDocument;
    }
    async 상신을취소한다(dto, queryRunner) {
        this.logger.log(`상신 취소 시작: ${dto.documentId}, 기안자: ${dto.drafterId}`);
        const document = await this.documentService.findOneWithError({
            where: { id: dto.documentId },
            relations: ['approvalSteps'],
            queryRunner,
        });
        if (document.status !== approval_enum_1.DocumentStatus.PENDING) {
            throw new common_1.BadRequestException('결재 진행 중인 문서만 상신취소할 수 있습니다.');
        }
        if (document.drafterId !== dto.drafterId) {
            throw new common_1.ForbiddenException('기안자만 상신취소할 수 있습니다.');
        }
        const hasAnyProcessed = document_policy_validator_1.DocumentPolicyValidator.hasAnyApprovalProcessed(document.approvalSteps);
        document_policy_validator_1.DocumentPolicyValidator.validateCancelSubmitOrThrow(document.status, hasAnyProcessed);
        document.취소한다(dto.reason);
        await this.commentService.createComment({
            documentId: document.id,
            authorId: dto.drafterId,
            content: dto.reason,
        }, queryRunner);
        const cancelledDocument = await this.documentService.save(document, { queryRunner });
        this.logger.log(`상신 취소 완료: ${dto.documentId}, 기안자: ${dto.drafterId}`);
        return cancelledDocument;
    }
    buildUpdatedMetadata(document, dto) {
        const existingHistory = document.metadata?.modificationHistory || [];
        const newHistoryItem = {
            previousTitle: document.title,
            previousContent: document.content,
            modifiedAt: new Date().toISOString(),
            modificationComment: dto.comment || '수정 사유 없음',
            documentStatus: document.status,
        };
        return {
            ...(document.metadata || {}),
            modificationHistory: [...existingHistory, newHistoryItem],
        };
    }
    async generateDocumentNumber(documentTemplateId, queryRunner) {
        let templateCode = 'EXT';
        if (documentTemplateId) {
            const documentTemplate = await this.documentTemplateService.findOne({
                where: { id: documentTemplateId },
                queryRunner,
            });
            if (documentTemplate) {
                templateCode = documentTemplate.code;
            }
        }
        const currentYear = new Date().getFullYear().toString();
        const yearStart = `${currentYear}-01-01`;
        const yearEnd = `${currentYear}-12-31`;
        const countResult = await queryRunner.query(`SELECT COUNT(*) as count FROM documents 
             WHERE "documentNumber" LIKE $1 
             AND "submittedAt" >= $2 
             AND "submittedAt" <= $3
             AND "documentNumber" IS NOT NULL`, [`${templateCode}-${currentYear}-%`, yearStart, yearEnd]);
        const seq = parseInt(countResult[0]?.count || '0') + 1;
        const seqStr = seq.toString().padStart(4, '0');
        return `${templateCode}-${currentYear}-${seqStr}`;
    }
    async createApprovalStepSnapshots(documentId, approvalSteps, queryRunner) {
        if (!approvalSteps || approvalSteps.length === 0)
            return;
        for (const step of approvalSteps) {
            const approverSnapshot = await this.buildApproverSnapshot(step.approverId, queryRunner);
            await this.approvalStepSnapshotService.createApprovalStepSnapshot({
                documentId,
                stepOrder: step.stepOrder,
                stepType: step.stepType,
                approverId: step.approverId,
                approverSnapshot,
            }, queryRunner);
        }
        this.logger.debug(`결재단계 스냅샷 ${approvalSteps.length}개 생성 완료: 문서 ${documentId}`);
    }
    async updateApprovalStepSnapshots(documentId, approvalSteps, queryRunner) {
        if (approvalSteps === undefined)
            return;
        const existingSnapshots = await this.approvalStepSnapshotService.findAll({
            where: { documentId },
            queryRunner,
        });
        const existingSnapshotIds = new Set(existingSnapshots.map((s) => s.id));
        const requestedSnapshotIds = new Set(approvalSteps.filter((step) => step.id).map((step) => step.id));
        const snapshotsToDelete = existingSnapshots.filter((s) => !requestedSnapshotIds.has(s.id));
        for (const snapshot of snapshotsToDelete) {
            await this.approvalStepSnapshotService.delete(snapshot.id, { queryRunner });
        }
        for (const step of approvalSteps) {
            const approverSnapshot = await this.buildApproverSnapshot(step.approverId, queryRunner);
            if (step.id && existingSnapshotIds.has(step.id)) {
                const existingSnapshot = existingSnapshots.find((s) => s.id === step.id);
                if (existingSnapshot) {
                    await this.approvalStepSnapshotService.updateApprovalStepSnapshot(existingSnapshot, {
                        stepOrder: step.stepOrder,
                        stepType: step.stepType,
                        approverId: step.approverId,
                        approverSnapshot,
                    }, queryRunner);
                }
            }
            else {
                await this.approvalStepSnapshotService.createApprovalStepSnapshot({
                    documentId,
                    stepOrder: step.stepOrder,
                    stepType: step.stepType,
                    approverId: step.approverId,
                    approverSnapshot,
                }, queryRunner);
            }
        }
        this.logger.debug(`결재단계 스냅샷 업데이트 완료: 문서 ${documentId}, ${approvalSteps.length}개 처리, ${snapshotsToDelete.length}개 삭제`);
    }
    async validateAndProcessApprovalSteps(documentId, approvalSteps, queryRunner) {
        if (approvalSteps && approvalSteps.length > 0) {
            const approvalTypeSteps = approvalSteps.filter((step) => step.stepType === approval_enum_1.ApprovalStepType.APPROVAL);
            const implementationTypeSteps = approvalSteps.filter((step) => step.stepType === approval_enum_1.ApprovalStepType.IMPLEMENTATION);
            if (approvalTypeSteps.length < 1 || implementationTypeSteps.length < 1) {
                throw new common_1.BadRequestException('결재 하나와 시행 하나는 필수로 필요합니다.');
            }
            await this.updateApprovalStepSnapshots(documentId, approvalSteps, queryRunner);
        }
        else {
            const existingSnapshots = await this.approvalStepSnapshotService.findAll({
                where: { documentId },
                queryRunner,
            });
            if (existingSnapshots.length === 0) {
                throw new common_1.BadRequestException('기안 시 결재선이 필요합니다.');
            }
            const approvalTypeSteps = existingSnapshots.filter((step) => step.stepType === approval_enum_1.ApprovalStepType.APPROVAL);
            const implementationTypeSteps = existingSnapshots.filter((step) => step.stepType === approval_enum_1.ApprovalStepType.IMPLEMENTATION);
            if (approvalTypeSteps.length < 1 || implementationTypeSteps.length < 1) {
                throw new common_1.BadRequestException('기존 결재선에 결재 하나와 시행 하나는 필수로 필요합니다.');
            }
        }
    }
    async buildApproverSnapshot(approverId, queryRunner) {
        const employee = await this.employeeService.findOne({
            where: { id: approverId },
            relations: [
                'departmentPositions',
                'departmentPositions.department',
                'departmentPositions.position',
                'currentRank',
            ],
            queryRunner,
        });
        if (!employee) {
            throw new common_1.NotFoundException(`결재자를 찾을 수 없습니다: ${approverId}`);
        }
        const currentDepartmentPosition = employee.departmentPositions?.find((dp) => dp.isManager) || employee.departmentPositions?.[0];
        const snapshot = {
            employeeName: employee.name,
            employeeNumber: employee.employeeNumber,
        };
        if (currentDepartmentPosition?.department) {
            snapshot.departmentId = currentDepartmentPosition.department.id;
            snapshot.departmentName = currentDepartmentPosition.department.departmentName;
        }
        if (currentDepartmentPosition?.position) {
            snapshot.positionId = currentDepartmentPosition.position.id;
            snapshot.positionTitle = currentDepartmentPosition.position.positionTitle;
        }
        if (employee.currentRank) {
            snapshot.rankId = employee.currentRank.id;
            snapshot.rankTitle = employee.currentRank.rankTitle;
        }
        return snapshot;
    }
};
exports.DocumentContext = DocumentContext;
exports.DocumentContext = DocumentContext = DocumentContext_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        document_service_1.DomainDocumentService,
        document_template_service_1.DomainDocumentTemplateService,
        employee_service_1.DomainEmployeeService,
        approval_step_snapshot_service_1.DomainApprovalStepSnapshotService,
        comment_service_1.DomainCommentService])
], DocumentContext);
//# sourceMappingURL=document.context.js.map