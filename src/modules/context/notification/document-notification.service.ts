import { Injectable, Logger } from '@nestjs/common';
import { NotificationContext } from './notification.context';
import { ApprovalStepType, ApprovalStatus, DocumentStatus } from '../../../common/enums/approval.enum';

/**
 * 문서 상태 변경 알림 서비스
 *
 * 역할:
 * - 문서 기안/협의/결재/반려/시행 등 상태 변경 시 관련자들에게 알림 전송
 * - 결재 프로세스 흐름에 따른 다음 담당자 알림
 */
@Injectable()
export class DocumentNotificationService {
    private readonly logger = new Logger(DocumentNotificationService.name);

    constructor(private readonly notificationContext: NotificationContext) {}

    /**
     * 문서 기안 시 초기 알림 전송
     * - 협의자가 있으면 협의자들에게 알림
     * - 협의자가 없고 첫 번째 결재자가 기안자가 아니면 첫 번째 결재자에게 알림
     */
    async sendNotificationAfterSubmit(params: {
        document: DocumentInfo;
        allSteps: ApprovalStepInfo[];
        drafterEmployeeNumber: string;
    }): Promise<void> {
        this.logger.log(`문서 기안 후 알림 전송: ${params.document.id}`);

        try {
            const { document, allSteps, drafterEmployeeNumber } = params;

            // 1. 협의 단계 확인
            const agreementSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.AGREEMENT);

            if (agreementSteps.length > 0) {
                // 케이스 1: 협의자들에게 알림
                await this.sendApprovalStepNotifications({
                    steps: agreementSteps,
                    document,
                    senderEmployeeNumber: drafterEmployeeNumber,
                    stepTypeText: '협의',
                });
            } else {
                // 협의자가 없으면 첫 번째 결재자 또는 시행자에게 알림
                const approvalSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.APPROVAL);
                const firstApprovalStep = approvalSteps.find((s) => s.status === ApprovalStatus.PENDING);

                if (firstApprovalStep && firstApprovalStep.approverId !== document.drafterId) {
                    // 케이스 2: 결재자에게 알림
                    await this.sendApprovalStepNotifications({
                        steps: [firstApprovalStep],
                        document,
                        senderEmployeeNumber: drafterEmployeeNumber,
                        stepTypeText: '결재',
                    });
                } else if (!firstApprovalStep) {
                    // 결재자가 없으면 시행자에게 알림
                    const implementationSteps = allSteps.filter(
                        (s) => s.stepType === ApprovalStepType.IMPLEMENTATION && s.status === ApprovalStatus.PENDING,
                    );

                    if (implementationSteps.length > 0) {
                        // 케이스 5: 시행자들에게 알림
                        await this.sendApprovalStepNotifications({
                            steps: implementationSteps,
                            document,
                            senderEmployeeNumber: drafterEmployeeNumber,
                            stepTypeText: '시행',
                        });
                    }
                }
            }
        } catch (error) {
            this.logger.error(`문서 기안 후 알림 전송 실패: ${params.document.id}`, error);
            // 알림 실패는 전체 프로세스를 중단시키지 않음
        }
    }

    /**
     * 협의 완료 후 알림 전송
     */
    async sendNotificationAfterCompleteAgreement(params: {
        document: DocumentInfo;
        allSteps: ApprovalStepInfo[];
        agreerEmployeeNumber: string;
    }): Promise<void> {
        this.logger.log(`협의 완료 후 알림 전송: ${params.document.id}`);

        try {
            const { document, allSteps, agreerEmployeeNumber } = params;

            // 모든 협의가 완료되었는지 확인
            const agreementSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.AGREEMENT);
            const allAgreementsCompleted = agreementSteps.every((s) => s.status === ApprovalStatus.APPROVED);

            if (!allAgreementsCompleted) {
                this.logger.debug('아직 완료되지 않은 협의가 있습니다.');
                return;
            }

            // 모든 협의가 완료되었으면 첫 번째 결재자에게 알림
            const approvalSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.APPROVAL);
            const firstApprovalStep = approvalSteps.find((s) => s.status === ApprovalStatus.PENDING);

            if (firstApprovalStep) {
                await this.sendApprovalStepNotifications({
                    steps: [firstApprovalStep],
                    document,
                    senderEmployeeNumber: agreerEmployeeNumber,
                    stepTypeText: '결재',
                });
            }
        } catch (error) {
            this.logger.error(`협의 완료 후 알림 전송 실패: ${params.document.id}`, error);
        }
    }

    /**
     * 결재 승인 후 알림 전송
     */
    async sendNotificationAfterApprove(params: {
        document: DocumentInfo;
        allSteps: ApprovalStepInfo[];
        currentStepId: string;
        approverEmployeeNumber: string;
    }): Promise<void> {
        this.logger.log(`결재 승인 후 알림 전송: ${params.document.id}`);

        try {
            const { document, allSteps, currentStepId, approverEmployeeNumber } = params;

            // 현재 승인한 단계
            const currentStep = allSteps.find((step) => step.id === currentStepId);
            if (!currentStep) {
                this.logger.warn(`현재 단계를 찾을 수 없습니다: ${currentStepId}`);
                return;
            }

            // 다음 처리해야 할 단계 찾기
            const nextPendingStep = this.findNextPendingStep(allSteps, currentStep.stepOrder);

            if (nextPendingStep) {
                // 다음 단계가 결재자인지 시행자인지 확인
                if (nextPendingStep.stepType === ApprovalStepType.APPROVAL) {
                    await this.sendApprovalStepNotifications({
                        steps: [nextPendingStep],
                        document,
                        senderEmployeeNumber: approverEmployeeNumber,
                        stepTypeText: '결재',
                    });
                } else if (nextPendingStep.stepType === ApprovalStepType.IMPLEMENTATION) {
                    const implementationSteps = allSteps.filter(
                        (s) => s.stepType === ApprovalStepType.IMPLEMENTATION && s.status === ApprovalStatus.PENDING,
                    );
                    await this.sendApprovalStepNotifications({
                        steps: implementationSteps,
                        document,
                        senderEmployeeNumber: approverEmployeeNumber,
                        stepTypeText: '시행',
                    });
                }
            } else {
                // 모든 단계 완료 - 참조자들과 기안자에게 알림
                await this.sendReferenceNotifications({
                    document,
                    allSteps,
                    senderEmployeeNumber: approverEmployeeNumber,
                });
                await this.sendDrafterNotification({
                    document,
                    status: DocumentStatus.APPROVED,
                    senderEmployeeNumber: approverEmployeeNumber,
                });
            }
        } catch (error) {
            this.logger.error(`결재 승인 후 알림 전송 실패: ${params.document.id}`, error);
        }
    }

    /**
     * 결재 반려 후 알림 전송
     */
    async sendNotificationAfterReject(params: {
        document: DocumentInfo;
        rejectReason: string;
        rejecterEmployeeNumber: string;
    }): Promise<void> {
        this.logger.log(`결재 반려 후 알림 전송: ${params.document.id}`);

        try {
            const { document, rejectReason, rejecterEmployeeNumber } = params;

            // 기안자에게 반려 알림
            await this.sendDrafterNotification({
                document,
                status: DocumentStatus.REJECTED,
                senderEmployeeNumber: rejecterEmployeeNumber,
                additionalInfo: { reason: rejectReason },
            });
        } catch (error) {
            this.logger.error(`결재 반려 후 알림 전송 실패: ${params.document.id}`, error);
        }
    }

    /**
     * 시행 완료 후 알림 전송
     */
    async sendNotificationAfterCompleteImplementation(params: {
        document: DocumentInfo;
        allSteps: ApprovalStepInfo[];
        implementerEmployeeNumber: string;
    }): Promise<void> {
        this.logger.log(`시행 완료 후 알림 전송: ${params.document.id}`);

        try {
            const { document, allSteps, implementerEmployeeNumber } = params;

            // 참조자들에게 알림
            await this.sendReferenceNotifications({
                document,
                allSteps,
                senderEmployeeNumber: implementerEmployeeNumber,
            });

            // 기안자에게 시행 완료 알림
            await this.sendDrafterNotification({
                document,
                status: DocumentStatus.IMPLEMENTED,
                senderEmployeeNumber: implementerEmployeeNumber,
            });
        } catch (error) {
            this.logger.error(`시행 완료 후 알림 전송 실패: ${params.document.id}`, error);
        }
    }

    /**
     * 결재 단계 승인자들에게 알림 전송 (공통)
     */
    private async sendApprovalStepNotifications(params: {
        steps: ApprovalStepInfo[];
        document: DocumentInfo;
        senderEmployeeNumber: string;
        stepTypeText: string;
    }): Promise<void> {
        const { steps, document, senderEmployeeNumber, stepTypeText } = params;

        if (steps.length === 0) {
            this.logger.debug('알림을 보낼 승인자가 없습니다.');
            return;
        }

        const approverIds = steps.map((step) => step.approverId);

        if (approverIds.length === 1) {
            // 단일 승인자
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
        } else {
            // 다수 승인자
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

    /**
     * 참조자들에게 알림 전송
     */
    private async sendReferenceNotifications(params: {
        document: DocumentInfo;
        allSteps: ApprovalStepInfo[];
        senderEmployeeNumber: string;
    }): Promise<void> {
        const { document, allSteps, senderEmployeeNumber } = params;

        const referenceSteps = allSteps.filter((step) => step.stepType === ApprovalStepType.REFERENCE);

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

    /**
     * 기안자에게 문서 상태별 알림 전송
     */
    private async sendDrafterNotification(params: {
        document: DocumentInfo;
        status: DocumentStatus;
        senderEmployeeNumber: string;
        additionalInfo?: { reason?: string };
    }): Promise<void> {
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

    /**
     * 문서 상태에 따른 기안자 알림 메시지 생성
     */
    private getDrafterNotificationMessage(
        status: DocumentStatus,
        documentTitle: string,
        additionalInfo?: { reason?: string },
    ): { title: string; content: string } {
        switch (status) {
            case DocumentStatus.REJECTED:
                return {
                    title: `[반려] ${documentTitle}`,
                    content: `작성하신 문서가 반려되었습니다.\n사유: ${additionalInfo?.reason || '사유 없음'}`,
                };
            case DocumentStatus.APPROVED:
                return {
                    title: `[완료] ${documentTitle}`,
                    content: `작성하신 문서의 결재가 완료되었습니다.`,
                };
            case DocumentStatus.IMPLEMENTED:
                return {
                    title: `[시행완료] ${documentTitle}`,
                    content: `작성하신 문서의 시행이 완료되었습니다.`,
                };
            case DocumentStatus.CANCELLED:
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

    /**
     * 다음 처리 가능한 단계 찾기
     */
    private findNextPendingStep(allSteps: ApprovalStepInfo[], currentStepOrder: number): ApprovalStepInfo | null {
        // 협의가 모두 완료되었는지 확인
        const agreementSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.AGREEMENT);
        const allAgreementsCompleted = agreementSteps.every((s) => s.status === ApprovalStatus.APPROVED);

        // 결재가 모두 완료되었는지 확인
        const approvalSteps = allSteps.filter((s) => s.stepType === ApprovalStepType.APPROVAL);
        const allApprovalsCompleted = approvalSteps.every((s) => s.status === ApprovalStatus.APPROVED);

        // 다음 결재자 찾기
        if (!allApprovalsCompleted) {
            const nextApprovalStep = approvalSteps.find(
                (step) => step.stepOrder > currentStepOrder && step.status === ApprovalStatus.PENDING,
            );

            if (nextApprovalStep && allAgreementsCompleted) {
                return nextApprovalStep;
            }
        }

        // 결재가 모두 완료되었으면 시행자 찾기
        if (allApprovalsCompleted) {
            const implementationStep = allSteps.find(
                (step) => step.stepType === ApprovalStepType.IMPLEMENTATION && step.status === ApprovalStatus.PENDING,
            );
            return implementationStep || null;
        }

        return null;
    }

    /**
     * 결재 단계 타입을 한글 텍스트로 변환
     */
    getStepTypeText(stepType: ApprovalStepType): string {
        switch (stepType) {
            case ApprovalStepType.AGREEMENT:
                return '협의';
            case ApprovalStepType.APPROVAL:
                return '결재';
            case ApprovalStepType.IMPLEMENTATION:
                return '시행';
            case ApprovalStepType.REFERENCE:
                return '참조';
            default:
                return '처리';
        }
    }
}

/**
 * 문서 정보 인터페이스
 */
export interface DocumentInfo {
    id: string;
    title: string;
    drafterId: string;
    drafterName?: string;
    status?: DocumentStatus;
}

/**
 * 결재 단계 정보 인터페이스
 */
export interface ApprovalStepInfo {
    id: string;
    stepOrder: number;
    stepType: ApprovalStepType;
    approverId: string;
    status: ApprovalStatus;
}
