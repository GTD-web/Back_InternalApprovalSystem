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
var ApprovalProcessContext_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalProcessContext = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const approval_step_snapshot_service_1 = require("../../domain/approval-step-snapshot/approval-step-snapshot.service");
const document_service_1 = require("../../domain/document/document.service");
const comment_service_1 = require("../../domain/comment/comment.service");
const document_entity_1 = require("../../domain/document/document.entity");
const approval_step_snapshot_entity_1 = require("../../domain/approval-step-snapshot/approval-step-snapshot.entity");
const approval_enum_1 = require("../../../common/enums/approval.enum");
const document_policy_validator_1 = require("../../../common/utils/document-policy.validator");
let ApprovalProcessContext = ApprovalProcessContext_1 = class ApprovalProcessContext {
    constructor(dataSource, approvalStepSnapshotService, documentService, commentService) {
        this.dataSource = dataSource;
        this.approvalStepSnapshotService = approvalStepSnapshotService;
        this.documentService = documentService;
        this.commentService = commentService;
        this.logger = new common_1.Logger(ApprovalProcessContext_1.name);
    }
    async completeAgreement(dto, queryRunner) {
        this.logger.log(`협의 완료 시작: ${dto.stepSnapshotId}`);
        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: dto.stepSnapshotId },
            relations: ['approver', 'document'],
            queryRunner,
        });
        document_policy_validator_1.DocumentPolicyValidator.validateReceiverActionOrThrow(step.stepType, step.document.status, document_policy_validator_1.ReceiverAction.APPROVE);
        if (step.approverId !== dto.agreerId) {
            throw new common_1.ForbiddenException('해당 협의를 완료할 권한이 없습니다.');
        }
        if (step.stepType !== approval_enum_1.ApprovalStepType.AGREEMENT) {
            throw new common_1.BadRequestException('협의 단계만 처리할 수 있습니다.');
        }
        if (step.status !== approval_enum_1.ApprovalStatus.PENDING) {
            throw new common_1.BadRequestException('대기 중인 협의만 완료할 수 있습니다.');
        }
        step.승인한다();
        const completedStep = await this.approvalStepSnapshotService.save(step, {
            queryRunner,
            relations: ['approver'],
        });
        if (dto.comment) {
            await this.commentService.createComment({
                documentId: step.documentId,
                authorId: dto.agreerId,
                content: dto.comment,
            }, queryRunner);
        }
        this.logger.log(`협의 완료: ${dto.stepSnapshotId}`);
        return completedStep;
    }
    async markReferenceRead(dto, queryRunner) {
        this.logger.log(`참조 열람 확인 시작: ${dto.stepSnapshotId}`);
        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: dto.stepSnapshotId },
            relations: ['approver', 'document'],
            queryRunner,
        });
        document_policy_validator_1.DocumentPolicyValidator.validateReceiverActionOrThrow(step.stepType, step.document.status, document_policy_validator_1.ReceiverAction.READ_REFERENCE);
        if (step.approverId !== dto.referenceUserId) {
            throw new common_1.ForbiddenException('해당 참조 문서를 열람 확인할 권한이 없습니다.');
        }
        if (step.stepType !== approval_enum_1.ApprovalStepType.REFERENCE) {
            throw new common_1.BadRequestException('참조 단계만 열람 확인할 수 있습니다.');
        }
        if (step.status === approval_enum_1.ApprovalStatus.APPROVED) {
            this.logger.warn(`이미 열람 확인된 참조 단계입니다: ${dto.stepSnapshotId}`);
            return step;
        }
        if (step.status !== approval_enum_1.ApprovalStatus.PENDING) {
            throw new common_1.BadRequestException('대기 중인 참조만 열람 확인할 수 있습니다.');
        }
        step.승인한다();
        const readStep = await this.approvalStepSnapshotService.save(step, { queryRunner, relations: ['approver'] });
        if (dto.comment) {
            await this.commentService.createComment({
                documentId: step.documentId,
                authorId: dto.referenceUserId,
                content: dto.comment,
            }, queryRunner);
        }
        this.logger.log(`참조 열람 확인 완료: ${dto.stepSnapshotId}`);
        return readStep;
    }
    async approveStep(dto, queryRunner) {
        this.logger.log(`결재 승인 시작: ${dto.stepSnapshotId}`);
        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: dto.stepSnapshotId },
            relations: ['approver', 'document'],
            queryRunner,
        });
        document_policy_validator_1.DocumentPolicyValidator.validateReceiverActionOrThrow(step.stepType, step.document.status, document_policy_validator_1.ReceiverAction.APPROVE);
        if (step.approverId !== dto.approverId) {
            throw new common_1.ForbiddenException('해당 결재를 승인할 권한이 없습니다.');
        }
        if (step.status !== approval_enum_1.ApprovalStatus.PENDING) {
            throw new common_1.BadRequestException('대기 중인 결재만 승인할 수 있습니다.');
        }
        if (step.stepType !== approval_enum_1.ApprovalStepType.APPROVAL) {
            throw new common_1.BadRequestException('결재 단계만 승인할 수 있습니다.');
        }
        await this.validateApprovalOrder(step, queryRunner);
        step.승인한다();
        const approvedStep = await this.approvalStepSnapshotService.save(step, {
            queryRunner,
            relations: ['approver'],
        });
        if (dto.comment) {
            await this.commentService.createComment({
                documentId: step.documentId,
                authorId: dto.approverId,
                content: dto.comment,
            }, queryRunner);
        }
        await this.checkAndUpdateDocumentStatus(step.documentId, queryRunner);
        this.logger.log(`결재 승인 완료: ${dto.stepSnapshotId}`);
        return approvedStep;
    }
    async completeImplementation(dto, queryRunner) {
        this.logger.log(`시행 완료 시작: ${dto.stepSnapshotId}`);
        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: dto.stepSnapshotId },
            relations: ['approver', 'document'],
            queryRunner,
        });
        document_policy_validator_1.DocumentPolicyValidator.validateReceiverActionOrThrow(step.stepType, step.document.status, document_policy_validator_1.ReceiverAction.COMPLETE_IMPLEMENTATION);
        if (step.approverId !== dto.implementerId) {
            throw new common_1.ForbiddenException('해당 시행을 완료할 권한이 없습니다.');
        }
        if (step.stepType !== approval_enum_1.ApprovalStepType.IMPLEMENTATION) {
            throw new common_1.BadRequestException('시행 단계만 처리할 수 있습니다.');
        }
        if (step.status !== approval_enum_1.ApprovalStatus.PENDING) {
            throw new common_1.BadRequestException('대기 중인 시행만 완료할 수 있습니다.');
        }
        step.승인한다();
        const completedStep = await this.approvalStepSnapshotService.save(step, {
            queryRunner,
            relations: ['approver'],
        });
        if (dto.comment) {
            await this.commentService.createComment({
                documentId: step.documentId,
                authorId: dto.implementerId,
                content: dto.comment,
            }, queryRunner);
        }
        const document = step.document;
        document.시행완료한다();
        if (dto.resultData) {
            document.메타데이터를설정한다(dto.resultData);
        }
        await this.documentService.save(document, { queryRunner });
        this.logger.log(`시행 완료: ${dto.stepSnapshotId}`);
        return completedStep;
    }
    async rejectStep(dto, queryRunner) {
        this.logger.log(`결재 반려 시작: ${dto.stepSnapshotId}`);
        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: dto.stepSnapshotId },
            relations: ['approver', 'document'],
            queryRunner,
        });
        document_policy_validator_1.DocumentPolicyValidator.validateReceiverActionOrThrow(step.stepType, step.document.status, document_policy_validator_1.ReceiverAction.REJECT);
        if (step.approverId !== dto.approverId) {
            throw new common_1.ForbiddenException('해당 결재를 반려할 권한이 없습니다.');
        }
        if (step.status !== approval_enum_1.ApprovalStatus.PENDING) {
            throw new common_1.BadRequestException('대기 중인 결재만 반려할 수 있습니다.');
        }
        if (!dto.comment || dto.comment.trim().length === 0) {
            throw new common_1.BadRequestException('반려 사유를 입력해야 합니다.');
        }
        if (step.stepType !== approval_enum_1.ApprovalStepType.APPROVAL) {
            throw new common_1.BadRequestException('결재 단계만 반려할 수 있습니다.');
        }
        step.반려한다();
        const rejectedStep = await this.approvalStepSnapshotService.save(step, {
            queryRunner,
            relations: ['approver'],
        });
        await this.commentService.createComment({
            documentId: step.documentId,
            authorId: dto.approverId,
            content: dto.comment,
        }, queryRunner);
        const document = step.document;
        document.반려한다();
        await this.documentService.save(document, { queryRunner });
        this.logger.log(`결재 반려 완료: ${dto.stepSnapshotId}`);
        return rejectedStep;
    }
    async 결재를취소한다(dto, queryRunner) {
        this.logger.log(`결재 취소 시작: ${dto.stepSnapshotId}, 결재자: ${dto.approverId}`);
        const step = await this.approvalStepSnapshotService.findOneWithError({
            where: { id: dto.stepSnapshotId },
            relations: ['document', 'document.approvalSteps'],
            queryRunner,
        });
        const document = step.document;
        if (document.status !== approval_enum_1.DocumentStatus.PENDING) {
            throw new common_1.BadRequestException('결재 진행 중인 문서만 결재취소할 수 있습니다.');
        }
        if (step.approverId !== dto.approverId) {
            throw new common_1.ForbiddenException('본인의 결재 단계만 취소할 수 있습니다.');
        }
        if (step.status !== approval_enum_1.ApprovalStatus.APPROVED) {
            throw new common_1.BadRequestException('승인한 결재만 취소할 수 있습니다.');
        }
        const hasNextProcessed = document_policy_validator_1.DocumentPolicyValidator.hasNextStepProcessed(step.stepOrder, document.approvalSteps);
        document_policy_validator_1.DocumentPolicyValidator.validateCancelApprovalOrThrow(step.status, hasNextProcessed);
        step.대기한다();
        if (dto.reason) {
            await this.commentService.createComment({
                documentId: step.documentId,
                authorId: dto.approverId,
                content: dto.reason,
            }, queryRunner);
        }
        await this.approvalStepSnapshotService.save(step, { queryRunner });
        this.logger.log(`결재 취소 완료: ${dto.stepSnapshotId}, 결재자: ${dto.approverId}`);
        return {
            stepSnapshotId: step.id,
            documentId: document.id,
            message: '결재가 취소되었습니다.',
        };
    }
    async getMyPendingApprovals(userId, type, page = 1, limit = 20, queryRunner) {
        const repository = queryRunner
            ? queryRunner.manager.getRepository(document_entity_1.Document)
            : this.dataSource.getRepository(document_entity_1.Document);
        const stepRepository = queryRunner
            ? queryRunner.manager.getRepository(approval_step_snapshot_entity_1.ApprovalStepSnapshot)
            : this.dataSource.getRepository(approval_step_snapshot_entity_1.ApprovalStepSnapshot);
        let documents = [];
        const currentStepsMap = new Map();
        let totalItems = 0;
        if (type === 'SUBMITTED') {
            const qb = repository
                .createQueryBuilder('document')
                .leftJoinAndSelect('document.drafter', 'drafter')
                .where('document.drafterId = :userId', { userId })
                .andWhere('document.status = :status', { status: approval_enum_1.DocumentStatus.PENDING })
                .orderBy('document.createdAt', 'DESC');
            totalItems = await qb.getCount();
            const skip = (page - 1) * limit;
            documents = await qb.skip(skip).take(limit).getMany();
        }
        else {
            const stepType = type === 'AGREEMENT' ? approval_enum_1.ApprovalStepType.AGREEMENT : approval_enum_1.ApprovalStepType.APPROVAL;
            const qb = stepRepository
                .createQueryBuilder('step')
                .leftJoinAndSelect('step.document', 'document')
                .leftJoinAndSelect('document.drafter', 'drafter')
                .where('step.approverId = :userId', { userId })
                .andWhere('step.stepType = :stepType', { stepType })
                .andWhere('step.status = :status', { status: approval_enum_1.ApprovalStatus.PENDING })
                .orderBy('step.createdAt', 'DESC');
            totalItems = await qb.getCount();
            const skip = (page - 1) * limit;
            const steps = await qb.skip(skip).take(limit).getMany();
            for (const step of steps) {
                const allSteps = await this.approvalStepSnapshotService.findAll({
                    where: { documentId: step.documentId },
                    order: { stepOrder: 'ASC' },
                    queryRunner,
                });
                if (await this.canProcessStepOptimized(step, allSteps)) {
                    documents.push(step.document);
                    currentStepsMap.set(step.documentId, step);
                }
            }
        }
        const data = await Promise.all(documents.map(async (doc) => {
            const currentStep = currentStepsMap.get(doc.id);
            const allApprovalSteps = await this.approvalStepSnapshotService.findAll({
                where: { documentId: doc.id },
                relations: ['approver'],
                order: { stepOrder: 'ASC' },
                queryRunner,
            });
            const approvalSteps = allApprovalSteps.map((step) => ({
                id: step.id,
                stepOrder: step.stepOrder,
                stepType: step.stepType,
                status: step.status,
                approverId: step.approverId,
                approverName: step.approverSnapshot?.employeeName || step.approver?.name || '',
                comment: step.comment,
                approvedAt: step.approvedAt,
            }));
            const currentStepInfo = currentStep
                ? {
                    id: currentStep.id,
                    stepOrder: currentStep.stepOrder,
                    stepType: currentStep.stepType,
                    status: currentStep.status,
                    approverId: currentStep.approverId,
                    approverSnapshot: currentStep.approverSnapshot,
                }
                : undefined;
            return {
                documentId: doc.id,
                documentNumber: doc.documentNumber,
                title: doc.title,
                status: doc.status,
                drafterId: doc.drafterId,
                drafterName: doc.drafter?.name || '',
                drafterDepartmentName: undefined,
                currentStep: currentStepInfo,
                approvalSteps,
                submittedAt: doc.submittedAt,
                createdAt: doc.createdAt,
            };
        }));
        const totalPages = Math.ceil(totalItems / limit);
        return {
            data,
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
    async getApprovalSteps(documentId, queryRunner) {
        const document = await this.documentService.findOne({
            where: { id: documentId },
            queryRunner,
        });
        if (!document) {
            throw new common_1.NotFoundException(`문서를 찾을 수 없습니다: ${documentId}`);
        }
        return await this.approvalStepSnapshotService.findAll({
            where: { documentId },
            relations: ['approver', 'document'],
            order: { stepOrder: 'ASC' },
            queryRunner,
        });
    }
    async getApprovalStepsByDocumentId(documentId, queryRunner) {
        return await this.approvalStepSnapshotService.findAll({
            where: { documentId },
            order: { stepOrder: 'ASC' },
            queryRunner,
        });
    }
    async checkAndUpdateDocumentStatus(documentId, queryRunner) {
        const allSteps = await this.approvalStepSnapshotService.findAll({
            where: { documentId },
            order: { stepOrder: 'ASC' },
            queryRunner,
        });
        const document = await this.documentService.findOneWithError({
            where: { id: documentId },
            queryRunner,
        });
        const nextStatus = document_policy_validator_1.DocumentPolicyValidator.determineNextDocumentStatus(document.status, allSteps);
        if (nextStatus) {
            document.승인완료한다();
            await this.documentService.save(document, { queryRunner });
            this.logger.log(`문서 상태 업데이트: ${documentId} -> ${nextStatus}`);
        }
        else {
            this.logger.log(`문서 상태 변경 조건 미충족: ${documentId}`);
        }
    }
    async validateApprovalOrder(currentStep, queryRunner) {
        const allSteps = await this.approvalStepSnapshotService.findAll({
            where: { documentId: currentStep.documentId },
            order: { stepOrder: 'ASC' },
            queryRunner,
        });
        document_policy_validator_1.DocumentPolicyValidator.validateApprovalOrderOrThrow(currentStep.stepType, currentStep.stepOrder, allSteps);
        this.logger.debug(`결재 순서 검증 통과: ${currentStep.id}`);
    }
    async autoApproveIfDrafterIsFirstApprover(documentId, drafterId, queryRunner) {
        const allSteps = await this.approvalStepSnapshotService.findAll({
            where: { documentId },
            order: { stepOrder: 'ASC' },
            queryRunner,
        });
        if (allSteps.length === 0) {
            return;
        }
        const hasAgreementStep = allSteps.some((step) => step.stepType === approval_enum_1.ApprovalStepType.AGREEMENT);
        if (hasAgreementStep) {
            this.logger.debug('합의 단계가 있어 기안자 자동 승인을 건너뜁니다.');
            return;
        }
        const firstStep = allSteps[0];
        if (firstStep.stepType === approval_enum_1.ApprovalStepType.APPROVAL &&
            firstStep.approverId === drafterId &&
            firstStep.status === approval_enum_1.ApprovalStatus.PENDING) {
            this.logger.log(`기안자가 첫 번째 결재자입니다. 자동 승인 처리: ${firstStep.id}`);
            firstStep.승인한다();
            await this.approvalStepSnapshotService.save(firstStep, { queryRunner });
            await this.commentService.createComment({
                documentId,
                authorId: drafterId,
                content: '기안자 자동 승인',
            }, queryRunner);
            const nextApprovalStep = allSteps.find((step) => step.stepOrder > firstStep.stepOrder &&
                step.stepType === approval_enum_1.ApprovalStepType.APPROVAL &&
                step.status === approval_enum_1.ApprovalStatus.PENDING);
            if (!nextApprovalStep) {
                const document = await this.documentService.findOneWithError({
                    where: { id: documentId },
                    queryRunner,
                });
                document.승인완료한다();
                await this.documentService.save(document, { queryRunner });
            }
            this.logger.log(`기안자 자동 승인 완료: ${firstStep.id}`);
        }
    }
    async canProcessStepOptimized(step, allSteps) {
        try {
            if (step.stepType === approval_enum_1.ApprovalStepType.AGREEMENT) {
                return true;
            }
            if (step.stepType === approval_enum_1.ApprovalStepType.APPROVAL) {
                const agreementSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.AGREEMENT);
                if (agreementSteps.length > 0) {
                    const allAgreementsCompleted = agreementSteps.every((s) => s.status === approval_enum_1.ApprovalStatus.APPROVED);
                    if (!allAgreementsCompleted) {
                        return false;
                    }
                }
                const approvalSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.APPROVAL);
                for (const prevStep of approvalSteps) {
                    if (prevStep.stepOrder < step.stepOrder) {
                        if (prevStep.status !== approval_enum_1.ApprovalStatus.APPROVED) {
                            return false;
                        }
                    }
                }
                return true;
            }
            if (step.stepType === approval_enum_1.ApprovalStepType.IMPLEMENTATION) {
                const agreementSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.AGREEMENT);
                if (agreementSteps.length > 0) {
                    const allAgreementsCompleted = agreementSteps.every((s) => s.status === approval_enum_1.ApprovalStatus.APPROVED);
                    if (!allAgreementsCompleted) {
                        return false;
                    }
                }
                const approvalSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.APPROVAL);
                if (approvalSteps.length > 0) {
                    const allApprovalsCompleted = approvalSteps.every((s) => s.status === approval_enum_1.ApprovalStatus.APPROVED);
                    if (!allApprovalsCompleted) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        }
        catch (error) {
            this.logger.error(`canProcessStepOptimized 오류: ${error.message}`);
            return false;
        }
    }
    async canProcessStep(step, queryRunner) {
        try {
            const allSteps = await this.approvalStepSnapshotService.findAll({
                where: { documentId: step.documentId },
                order: { stepOrder: 'ASC' },
                queryRunner,
            });
            if (step.stepType === approval_enum_1.ApprovalStepType.AGREEMENT) {
                return true;
            }
            if (step.stepType === approval_enum_1.ApprovalStepType.APPROVAL) {
                const agreementSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.AGREEMENT);
                if (agreementSteps.length > 0) {
                    const allAgreementsCompleted = agreementSteps.every((s) => s.status === approval_enum_1.ApprovalStatus.APPROVED);
                    if (!allAgreementsCompleted) {
                        return false;
                    }
                }
                const approvalSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.APPROVAL);
                for (const prevStep of approvalSteps) {
                    if (prevStep.stepOrder < step.stepOrder) {
                        if (prevStep.status !== approval_enum_1.ApprovalStatus.APPROVED) {
                            return false;
                        }
                    }
                }
                return true;
            }
            if (step.stepType === approval_enum_1.ApprovalStepType.IMPLEMENTATION) {
                const agreementSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.AGREEMENT);
                if (agreementSteps.length > 0) {
                    const allAgreementsCompleted = agreementSteps.every((s) => s.status === approval_enum_1.ApprovalStatus.APPROVED);
                    if (!allAgreementsCompleted) {
                        return false;
                    }
                }
                const approvalSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.APPROVAL);
                const allApprovalsCompleted = approvalSteps.every((s) => s.status === approval_enum_1.ApprovalStatus.APPROVED);
                return allApprovalsCompleted;
            }
            if (step.stepType === approval_enum_1.ApprovalStepType.REFERENCE) {
                return false;
            }
            return false;
        }
        catch (error) {
            this.logger.error(`단계 처리 가능 여부 확인 실패: ${step.id}`, error);
            return false;
        }
    }
};
exports.ApprovalProcessContext = ApprovalProcessContext;
exports.ApprovalProcessContext = ApprovalProcessContext = ApprovalProcessContext_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        approval_step_snapshot_service_1.DomainApprovalStepSnapshotService,
        document_service_1.DomainDocumentService,
        comment_service_1.DomainCommentService])
], ApprovalProcessContext);
//# sourceMappingURL=approval-process.context.js.map