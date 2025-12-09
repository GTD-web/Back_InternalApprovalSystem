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
var DocumentNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentNotificationService = void 0;
const common_1 = require("@nestjs/common");
const notification_context_1 = require("./notification.context");
const approval_enum_1 = require("../../../common/enums/approval.enum");
let DocumentNotificationService = DocumentNotificationService_1 = class DocumentNotificationService {
    constructor(notificationContext) {
        this.notificationContext = notificationContext;
        this.logger = new common_1.Logger(DocumentNotificationService_1.name);
    }
    async sendNotificationAfterSubmit(params) {
        this.logger.log(`문서 기안 후 알림 전송: ${params.document.id}`);
        try {
            const { document, allSteps, drafterEmployeeNumber } = params;
            const agreementSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.AGREEMENT);
            if (agreementSteps.length > 0) {
                await this.sendApprovalStepNotifications({
                    steps: agreementSteps,
                    document,
                    senderEmployeeNumber: drafterEmployeeNumber,
                    stepTypeText: '협의',
                });
            }
            else {
                const approvalSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.APPROVAL);
                const firstApprovalStep = approvalSteps.find((s) => s.status === approval_enum_1.ApprovalStatus.PENDING);
                if (firstApprovalStep && firstApprovalStep.approverId !== document.drafterId) {
                    await this.sendApprovalStepNotifications({
                        steps: [firstApprovalStep],
                        document,
                        senderEmployeeNumber: drafterEmployeeNumber,
                        stepTypeText: '결재',
                    });
                }
                else if (!firstApprovalStep) {
                    const implementationSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.IMPLEMENTATION && s.status === approval_enum_1.ApprovalStatus.PENDING);
                    if (implementationSteps.length > 0) {
                        await this.sendApprovalStepNotifications({
                            steps: implementationSteps,
                            document,
                            senderEmployeeNumber: drafterEmployeeNumber,
                            stepTypeText: '시행',
                        });
                    }
                }
            }
        }
        catch (error) {
            this.logger.error(`문서 기안 후 알림 전송 실패: ${params.document.id}`, error);
        }
    }
    async sendNotificationAfterCompleteAgreement(params) {
        this.logger.log(`협의 완료 후 알림 전송: ${params.document.id}`);
        try {
            const { document, allSteps, agreerEmployeeNumber } = params;
            const agreementSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.AGREEMENT);
            const allAgreementsCompleted = agreementSteps.every((s) => s.status === approval_enum_1.ApprovalStatus.APPROVED);
            if (!allAgreementsCompleted) {
                this.logger.debug('아직 완료되지 않은 협의가 있습니다.');
                return;
            }
            const approvalSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.APPROVAL);
            const firstApprovalStep = approvalSteps.find((s) => s.status === approval_enum_1.ApprovalStatus.PENDING);
            if (firstApprovalStep) {
                await this.sendApprovalStepNotifications({
                    steps: [firstApprovalStep],
                    document,
                    senderEmployeeNumber: agreerEmployeeNumber,
                    stepTypeText: '결재',
                });
            }
        }
        catch (error) {
            this.logger.error(`협의 완료 후 알림 전송 실패: ${params.document.id}`, error);
        }
    }
    async sendNotificationAfterApprove(params) {
        this.logger.log(`결재 승인 후 알림 전송: ${params.document.id}`);
        try {
            const { document, allSteps, currentStepId, approverEmployeeNumber } = params;
            const currentStep = allSteps.find((step) => step.id === currentStepId);
            if (!currentStep) {
                this.logger.warn(`현재 단계를 찾을 수 없습니다: ${currentStepId}`);
                return;
            }
            const nextPendingStep = this.findNextPendingStep(allSteps, currentStep.stepOrder);
            if (nextPendingStep) {
                if (nextPendingStep.stepType === approval_enum_1.ApprovalStepType.APPROVAL) {
                    await this.sendApprovalStepNotifications({
                        steps: [nextPendingStep],
                        document,
                        senderEmployeeNumber: approverEmployeeNumber,
                        stepTypeText: '결재',
                    });
                }
                else if (nextPendingStep.stepType === approval_enum_1.ApprovalStepType.IMPLEMENTATION) {
                    const implementationSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.IMPLEMENTATION && s.status === approval_enum_1.ApprovalStatus.PENDING);
                    await this.sendApprovalStepNotifications({
                        steps: implementationSteps,
                        document,
                        senderEmployeeNumber: approverEmployeeNumber,
                        stepTypeText: '시행',
                    });
                }
            }
            else {
                await this.sendReferenceNotifications({
                    document,
                    allSteps,
                    senderEmployeeNumber: approverEmployeeNumber,
                });
                await this.sendDrafterNotification({
                    document,
                    status: approval_enum_1.DocumentStatus.APPROVED,
                    senderEmployeeNumber: approverEmployeeNumber,
                });
            }
        }
        catch (error) {
            this.logger.error(`결재 승인 후 알림 전송 실패: ${params.document.id}`, error);
        }
    }
    async sendNotificationAfterReject(params) {
        this.logger.log(`결재 반려 후 알림 전송: ${params.document.id}`);
        try {
            const { document, rejectReason, rejecterEmployeeNumber } = params;
            await this.sendDrafterNotification({
                document,
                status: approval_enum_1.DocumentStatus.REJECTED,
                senderEmployeeNumber: rejecterEmployeeNumber,
                additionalInfo: { reason: rejectReason },
            });
        }
        catch (error) {
            this.logger.error(`결재 반려 후 알림 전송 실패: ${params.document.id}`, error);
        }
    }
    async sendNotificationAfterCompleteImplementation(params) {
        this.logger.log(`시행 완료 후 알림 전송: ${params.document.id}`);
        try {
            const { document, allSteps, implementerEmployeeNumber } = params;
            await this.sendReferenceNotifications({
                document,
                allSteps,
                senderEmployeeNumber: implementerEmployeeNumber,
            });
            await this.sendDrafterNotification({
                document,
                status: approval_enum_1.DocumentStatus.IMPLEMENTED,
                senderEmployeeNumber: implementerEmployeeNumber,
            });
        }
        catch (error) {
            this.logger.error(`시행 완료 후 알림 전송 실패: ${params.document.id}`, error);
        }
    }
    async sendApprovalStepNotifications(params) {
        const { steps, document, senderEmployeeNumber, stepTypeText } = params;
        if (steps.length === 0) {
            this.logger.debug('알림을 보낼 승인자가 없습니다.');
            return;
        }
        const approverIds = steps.map((step) => step.approverId);
        if (approverIds.length === 1) {
            await this.notificationContext.sendNotificationToEmployee({
                sender: senderEmployeeNumber,
                title: `[${stepTypeText}] ${document.title}`,
                content: `${document.drafterName || '기안자'}님이 작성한 문서가 ${stepTypeText} 대기 중입니다.`,
                recipientEmployeeId: approverIds[0],
                linkUrl: `/approval/document/${document.id}`,
                metadata: {
                    documentId: document.id,
                    stepId: steps[0].id,
                    stepType: steps[0].stepType,
                },
            });
        }
        else {
            await this.notificationContext.sendNotification({
                sender: senderEmployeeNumber,
                title: `[${stepTypeText}] ${document.title}`,
                content: `${document.drafterName || '기안자'}님이 작성한 문서가 ${stepTypeText} 대기 중입니다.`,
                recipientEmployeeIds: approverIds,
                linkUrl: `/approval/document/${document.id}`,
                metadata: {
                    documentId: document.id,
                    stepType: steps[0].stepType,
                    stepIds: steps.map((step) => step.id),
                },
            });
        }
        this.logger.log(`${stepTypeText} 알림 전송 완료: ${approverIds.length}명`);
    }
    async sendReferenceNotifications(params) {
        const { document, allSteps, senderEmployeeNumber } = params;
        const referenceSteps = allSteps.filter((step) => step.stepType === approval_enum_1.ApprovalStepType.REFERENCE);
        if (referenceSteps.length === 0) {
            this.logger.debug('참조자가 없습니다.');
            return;
        }
        const referenceIds = referenceSteps.map((step) => step.approverId);
        await this.notificationContext.sendNotification({
            sender: senderEmployeeNumber,
            title: `[참조] ${document.title}`,
            content: `${document.drafterName || '기안자'}님의 문서가 최종 승인 완료되었습니다.`,
            recipientEmployeeIds: referenceIds,
            linkUrl: `/approval/document/${document.id}`,
            metadata: {
                documentId: document.id,
                status: document.status,
            },
        });
        this.logger.log(`참조자 알림 전송 완료: ${referenceIds.length}명`);
    }
    async sendDrafterNotification(params) {
        const { document, status, senderEmployeeNumber, additionalInfo } = params;
        const { title, content } = this.getDrafterNotificationMessage(status, document.title, additionalInfo);
        await this.notificationContext.sendNotificationToEmployee({
            sender: senderEmployeeNumber,
            title,
            content,
            recipientEmployeeId: document.drafterId,
            linkUrl: `/approval/document/${document.id}`,
            metadata: {
                documentId: document.id,
                status: status,
                ...additionalInfo,
            },
        });
        this.logger.log(`기안자 알림 전송 완료 (${status}): ${document.drafterId}`);
    }
    getDrafterNotificationMessage(status, documentTitle, additionalInfo) {
        switch (status) {
            case approval_enum_1.DocumentStatus.REJECTED:
                return {
                    title: `[반려] ${documentTitle}`,
                    content: `작성하신 문서가 반려되었습니다.\n사유: ${additionalInfo?.reason || '사유 없음'}`,
                };
            case approval_enum_1.DocumentStatus.APPROVED:
                return {
                    title: `[완료] ${documentTitle}`,
                    content: `작성하신 문서의 결재가 완료되었습니다.`,
                };
            case approval_enum_1.DocumentStatus.IMPLEMENTED:
                return {
                    title: `[시행완료] ${documentTitle}`,
                    content: `작성하신 문서의 시행이 완료되었습니다.`,
                };
            case approval_enum_1.DocumentStatus.CANCELLED:
                return {
                    title: `[취소] ${documentTitle}`,
                    content: `문서가 취소되었습니다.`,
                };
            default:
                return {
                    title: `[알림] ${documentTitle}`,
                    content: `문서 상태가 변경되었습니다.`,
                };
        }
    }
    findNextPendingStep(allSteps, currentStepOrder) {
        const agreementSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.AGREEMENT);
        const allAgreementsCompleted = agreementSteps.every((s) => s.status === approval_enum_1.ApprovalStatus.APPROVED);
        const approvalSteps = allSteps.filter((s) => s.stepType === approval_enum_1.ApprovalStepType.APPROVAL);
        const allApprovalsCompleted = approvalSteps.every((s) => s.status === approval_enum_1.ApprovalStatus.APPROVED);
        if (!allApprovalsCompleted) {
            const nextApprovalStep = approvalSteps.find((step) => step.stepOrder > currentStepOrder && step.status === approval_enum_1.ApprovalStatus.PENDING);
            if (nextApprovalStep && allAgreementsCompleted) {
                return nextApprovalStep;
            }
        }
        if (allApprovalsCompleted) {
            const implementationStep = allSteps.find((step) => step.stepType === approval_enum_1.ApprovalStepType.IMPLEMENTATION && step.status === approval_enum_1.ApprovalStatus.PENDING);
            return implementationStep || null;
        }
        return null;
    }
    getStepTypeText(stepType) {
        switch (stepType) {
            case approval_enum_1.ApprovalStepType.AGREEMENT:
                return '협의';
            case approval_enum_1.ApprovalStepType.APPROVAL:
                return '결재';
            case approval_enum_1.ApprovalStepType.IMPLEMENTATION:
                return '시행';
            case approval_enum_1.ApprovalStepType.REFERENCE:
                return '참조';
            default:
                return '처리';
        }
    }
};
exports.DocumentNotificationService = DocumentNotificationService;
exports.DocumentNotificationService = DocumentNotificationService = DocumentNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notification_context_1.NotificationContext])
], DocumentNotificationService);
//# sourceMappingURL=document-notification.service.js.map