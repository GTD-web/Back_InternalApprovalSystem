import { BadRequestException } from '@nestjs/common';
import { DocumentStatus, ApprovalStepType, ApprovalStatus } from '../enums/approval.enum';

/**
 * 기안자 액션 타입
 */
export enum DrafterAction {
    /** 문서 내용 수정 */
    UPDATE_CONTENT = 'UPDATE_CONTENT',
    /** 결재선 수정 */
    UPDATE_APPROVAL_LINE = 'UPDATE_APPROVAL_LINE',
    /** 문서 삭제 */
    DELETE = 'DELETE',
    /** 상신 */
    SUBMIT = 'SUBMIT',
    /** 상신 취소 */
    CANCEL_SUBMIT = 'CANCEL_SUBMIT',
}

/**
 * 수신자 액션 타입
 */
export enum ReceiverAction {
    /** 승인 (결재/합의) */
    APPROVE = 'APPROVE',
    /** 반려 */
    REJECT = 'REJECT',
    /** 결재 취소 */
    CANCEL = 'CANCEL',
    /** 시행 완료 */
    COMPLETE_IMPLEMENTATION = 'COMPLETE_IMPLEMENTATION',
    /** 참조 열람 */
    READ_REFERENCE = 'READ_REFERENCE',
}

/**
 * 검증 결과 타입
 */
export interface ValidationResult {
    isValid: boolean;
    errorMessage?: string;
}

/**
 * 전자결재 정책 검증기
 *
 * 전자결재 기능 동작 기준에 따른 검증 로직을 제공합니다.
 *
 * @see 전자결재 관련 정의사항.md
 *
 * 정책 변경 시 이 파일만 수정하면 됩니다.
 */
export class DocumentPolicyValidator {
    // ==================== 정책 정의 (변경 포인트) ====================

    /**
     * 문서 상태별 기안자 가능 액션 정의
     *
     * 정책:
     * - 임시저장: 문서내용 수정, 결재선 수정, 삭제, 상신 가능
     * - 결재진행중: 문서내용 수정, 상신취소(조건부) 가능
     * - 결재완료/반려/시행완료/취소: 수정 불가
     */
    private static readonly DRAFTER_ALLOWED_ACTIONS: Record<DocumentStatus, DrafterAction[]> = {
        [DocumentStatus.DRAFT]: [
            DrafterAction.UPDATE_CONTENT,
            DrafterAction.UPDATE_APPROVAL_LINE,
            DrafterAction.DELETE,
            DrafterAction.SUBMIT,
        ],
        [DocumentStatus.PENDING]: [DrafterAction.UPDATE_CONTENT, DrafterAction.CANCEL_SUBMIT],
        [DocumentStatus.APPROVED]: [],
        [DocumentStatus.REJECTED]: [],
        [DocumentStatus.IMPLEMENTED]: [],
        [DocumentStatus.CANCELLED]: [],
    };

    /**
     * 수신자 역할별 가능 문서 상태 및 액션 정의
     *
     * 정책:
     * - 합의자: 결재진행중일 때 합의(승인/반려)
     * - 결재자: 결재진행중일 때 결재(승인/반려), 결재취소(조건부)
     * - 시행자: 결재완료일 때 시행
     * - 참조자: 시행완료일 때 열람
     */
    private static readonly RECEIVER_POLICY: Record<
        ApprovalStepType,
        {
            allowedDocumentStatuses: DocumentStatus[];
            allowedActions: ReceiverAction[];
        }
    > = {
        [ApprovalStepType.AGREEMENT]: {
            allowedDocumentStatuses: [DocumentStatus.PENDING],
            allowedActions: [ReceiverAction.APPROVE, ReceiverAction.REJECT],
        },
        [ApprovalStepType.APPROVAL]: {
            allowedDocumentStatuses: [DocumentStatus.PENDING],
            allowedActions: [ReceiverAction.APPROVE, ReceiverAction.REJECT, ReceiverAction.CANCEL],
        },
        [ApprovalStepType.IMPLEMENTATION]: {
            allowedDocumentStatuses: [DocumentStatus.APPROVED],
            allowedActions: [ReceiverAction.COMPLETE_IMPLEMENTATION],
        },
        [ApprovalStepType.REFERENCE]: {
            allowedDocumentStatuses: [
                DocumentStatus.DRAFT,
                DocumentStatus.PENDING,
                DocumentStatus.APPROVED,
                DocumentStatus.REJECTED,
                DocumentStatus.CANCELLED,
                DocumentStatus.IMPLEMENTED,
            ],
            allowedActions: [ReceiverAction.READ_REFERENCE],
        },
    };

    /**
     * 문서 상태 한글명 매핑
     */
    private static readonly DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
        [DocumentStatus.DRAFT]: '임시저장',
        [DocumentStatus.PENDING]: '결재진행중',
        [DocumentStatus.APPROVED]: '결재완료',
        [DocumentStatus.REJECTED]: '반려',
        [DocumentStatus.IMPLEMENTED]: '시행완료',
        [DocumentStatus.CANCELLED]: '취소',
    };

    /**
     * 수신자 역할 한글명 매핑
     */
    private static readonly STEP_TYPE_LABELS: Record<ApprovalStepType, string> = {
        [ApprovalStepType.AGREEMENT]: '합의자',
        [ApprovalStepType.APPROVAL]: '결재자',
        [ApprovalStepType.IMPLEMENTATION]: '시행자',
        [ApprovalStepType.REFERENCE]: '참조자',
    };

    /**
     * 기안자 액션 한글명 매핑
     */
    private static readonly DRAFTER_ACTION_LABELS: Record<DrafterAction, string> = {
        [DrafterAction.UPDATE_CONTENT]: '문서 내용 수정',
        [DrafterAction.UPDATE_APPROVAL_LINE]: '결재선 수정',
        [DrafterAction.DELETE]: '문서 삭제',
        [DrafterAction.SUBMIT]: '상신',
        [DrafterAction.CANCEL_SUBMIT]: '상신 취소',
    };

    /**
     * 수신자 액션 한글명 매핑
     */
    private static readonly RECEIVER_ACTION_LABELS: Record<ReceiverAction, string> = {
        [ReceiverAction.APPROVE]: '승인',
        [ReceiverAction.REJECT]: '반려',
        [ReceiverAction.CANCEL]: '결재 취소',
        [ReceiverAction.COMPLETE_IMPLEMENTATION]: '시행 완료',
        [ReceiverAction.READ_REFERENCE]: '참조 열람',
    };

    // ==================== 기안자 검증 메서드 ====================

    /**
     * 기안자의 액션 가능 여부를 검증합니다.
     *
     * @param documentStatus 현재 문서 상태
     * @param action 수행하려는 액션
     * @returns 검증 결과
     */
    static validateDrafterAction(documentStatus: DocumentStatus, action: DrafterAction): ValidationResult {
        const allowedActions = this.DRAFTER_ALLOWED_ACTIONS[documentStatus] || [];

        if (!allowedActions.includes(action)) {
            const statusLabel = this.DOCUMENT_STATUS_LABELS[documentStatus];
            const actionLabel = this.DRAFTER_ACTION_LABELS[action];
            const allowedLabels = allowedActions.map((a) => this.DRAFTER_ACTION_LABELS[a]).join(', ');

            return {
                isValid: false,
                errorMessage: `'${statusLabel}' 상태의 문서에서는 '${actionLabel}'을(를) 수행할 수 없습니다.${allowedLabels ? ` 가능한 액션: ${allowedLabels}` : ' 가능한 액션이 없습니다.'}`,
            };
        }

        return { isValid: true };
    }

    /**
     * 기안자의 액션 가능 여부를 검증하고, 실패 시 예외를 던집니다.
     *
     * @throws BadRequestException 검증 실패 시
     */
    static validateDrafterActionOrThrow(documentStatus: DocumentStatus, action: DrafterAction): void {
        const result = this.validateDrafterAction(documentStatus, action);
        if (!result.isValid) {
            throw new BadRequestException(result.errorMessage);
        }
    }

    /**
     * 문서 내용 수정 가능 여부를 검증합니다.
     */
    static canUpdateContent(documentStatus: DocumentStatus): boolean {
        return this.validateDrafterAction(documentStatus, DrafterAction.UPDATE_CONTENT).isValid;
    }

    /**
     * 결재선 수정 가능 여부를 검증합니다.
     */
    static canUpdateApprovalLine(documentStatus: DocumentStatus): boolean {
        return this.validateDrafterAction(documentStatus, DrafterAction.UPDATE_APPROVAL_LINE).isValid;
    }

    /**
     * 문서 삭제 가능 여부를 검증합니다.
     */
    static canDelete(documentStatus: DocumentStatus): boolean {
        return this.validateDrafterAction(documentStatus, DrafterAction.DELETE).isValid;
    }

    /**
     * 상신 가능 여부를 검증합니다.
     */
    static canSubmit(documentStatus: DocumentStatus): boolean {
        return this.validateDrafterAction(documentStatus, DrafterAction.SUBMIT).isValid;
    }

    // ==================== 상신 취소 검증 ====================

    /**
     * 상신 취소 가능 여부를 검증합니다.
     *
     * 조건:
     * 1. 문서 상태가 결재진행중(PENDING)이어야 함
     * 2. 결재자가 아직 어떤 처리도 하지 않은 상태여야 함
     *
     * @param documentStatus 문서 상태
     * @param hasAnyApprovalProcessed 결재자가 처리한 건이 있는지 여부
     * @returns 검증 결과
     */
    static validateCancelSubmit(documentStatus: DocumentStatus, hasAnyApprovalProcessed: boolean): ValidationResult {
        // 1. 문서 상태 검증
        if (documentStatus !== DocumentStatus.PENDING) {
            return {
                isValid: false,
                errorMessage: `'${this.DOCUMENT_STATUS_LABELS[documentStatus]}' 상태의 문서는 상신 취소할 수 없습니다. 결재진행중 상태에서만 상신 취소가 가능합니다.`,
            };
        }

        // 2. 결재자 처리 여부 검증
        if (hasAnyApprovalProcessed) {
            return {
                isValid: false,
                errorMessage: '이미 결재자가 처리한 건이 있어 상신 취소할 수 없습니다.',
            };
        }

        return { isValid: true };
    }

    /**
     * 상신 취소 가능 여부를 검증하고, 실패 시 예외를 던집니다.
     *
     * @throws BadRequestException 검증 실패 시
     */
    static validateCancelSubmitOrThrow(documentStatus: DocumentStatus, hasAnyApprovalProcessed: boolean): void {
        const result = this.validateCancelSubmit(documentStatus, hasAnyApprovalProcessed);
        if (!result.isValid) {
            throw new BadRequestException(result.errorMessage);
        }
    }

    // ==================== 수신자 검증 메서드 ====================

    /**
     * 수신자의 액션 가능 여부를 검증합니다.
     *
     * @param stepType 결재 단계 타입 (합의/결재/시행/참조)
     * @param documentStatus 현재 문서 상태
     * @param action 수행하려는 액션
     * @returns 검증 결과
     */
    static validateReceiverAction(
        stepType: ApprovalStepType,
        documentStatus: DocumentStatus,
        action: ReceiverAction,
    ): ValidationResult {
        const policy = this.RECEIVER_POLICY[stepType];

        if (!policy) {
            return {
                isValid: false,
                errorMessage: `알 수 없는 결재 단계 타입입니다: ${stepType}`,
            };
        }

        const stepTypeLabel = this.STEP_TYPE_LABELS[stepType];
        const documentStatusLabel = this.DOCUMENT_STATUS_LABELS[documentStatus];
        const actionLabel = this.RECEIVER_ACTION_LABELS[action];

        // 1. 문서 상태 검증
        if (!policy.allowedDocumentStatuses.includes(documentStatus)) {
            const allowedStatusLabels = policy.allowedDocumentStatuses
                .map((s) => this.DOCUMENT_STATUS_LABELS[s])
                .join(', ');

            return {
                isValid: false,
                errorMessage: `'${stepTypeLabel}'는 '${documentStatusLabel}' 상태의 문서에서 처리할 수 없습니다. 허용되는 문서 상태: ${allowedStatusLabels}`,
            };
        }

        // 2. 액션 검증
        if (!policy.allowedActions.includes(action)) {
            const allowedActionLabels = policy.allowedActions.map((a) => this.RECEIVER_ACTION_LABELS[a]).join(', ');

            return {
                isValid: false,
                errorMessage: `'${stepTypeLabel}'는 '${actionLabel}'을(를) 수행할 수 없습니다. 가능한 액션: ${allowedActionLabels}`,
            };
        }

        return { isValid: true };
    }

    /**
     * 수신자의 액션 가능 여부를 검증하고, 실패 시 예외를 던집니다.
     *
     * @throws BadRequestException 검증 실패 시
     */
    static validateReceiverActionOrThrow(
        stepType: ApprovalStepType,
        documentStatus: DocumentStatus,
        action: ReceiverAction,
    ): void {
        const result = this.validateReceiverAction(stepType, documentStatus, action);
        if (!result.isValid) {
            throw new BadRequestException(result.errorMessage);
        }
    }

    // ==================== 결재 취소 검증 ====================

    /**
     * 결재 취소 가능 여부를 검증합니다.
     *
     * 조건:
     * 1. 해당 수신자가 이미 승인한 상태여야 함
     * 2. 다음 단계 수신자가 아직 어떤 행동도 하지 않은 상태여야 함
     *
     * @param currentStepStatus 현재 단계의 상태
     * @param hasNextStepProcessed 다음 단계가 처리되었는지 여부
     * @returns 검증 결과
     */
    static validateCancelApproval(currentStepStatus: ApprovalStatus, hasNextStepProcessed: boolean): ValidationResult {
        // 1. 현재 단계가 승인 상태인지 검증
        if (currentStepStatus !== ApprovalStatus.APPROVED) {
            return {
                isValid: false,
                errorMessage: '본인이 승인한 단계만 결재 취소할 수 있습니다.',
            };
        }

        // 2. 다음 단계 처리 여부 검증
        if (hasNextStepProcessed) {
            return {
                isValid: false,
                errorMessage: '다음 단계가 이미 처리되어 결재 취소할 수 없습니다.',
            };
        }

        return { isValid: true };
    }

    /**
     * 결재 취소 가능 여부를 검증하고, 실패 시 예외를 던집니다.
     *
     * @throws BadRequestException 검증 실패 시
     */
    static validateCancelApprovalOrThrow(currentStepStatus: ApprovalStatus, hasNextStepProcessed: boolean): void {
        const result = this.validateCancelApproval(currentStepStatus, hasNextStepProcessed);
        if (!result.isValid) {
            throw new BadRequestException(result.errorMessage);
        }
    }

    // ==================== 결재 진행 순서 검증 ====================

    /**
     * 결재 진행 순서를 검증합니다.
     *
     * 정책: 결재선은 하나의 순서 값(stepOrder)으로 이어지며, 협의와 결재가 섞일 수 있음.
     * 내 단계보다 앞선 순서 값(stepOrder)을 가진 모든 단계(협의·결재 구분 없이)가 승인되어 있어야 함.
     *
     * @param currentStepType 현재 처리하려는 단계 타입
     * @param currentStepOrder 현재 처리하려는 단계 순서
     * @param allSteps 모든 결재 단계 (stepOrder 오름차순 정렬)
     * @returns 검증 결과
     */
    static validateApprovalOrder(
        currentStepType: ApprovalStepType,
        currentStepOrder: number,
        allSteps: Array<{
            stepType: ApprovalStepType;
            stepOrder: number;
            status: ApprovalStatus;
        }>,
    ): ValidationResult {
        const previousSteps = allSteps.filter((s) => s.stepOrder < currentStepOrder);
        const pendingPrevious = previousSteps.filter((s) => s.status !== ApprovalStatus.APPROVED);

        if (pendingPrevious.length > 0) {
            return {
                isValid: false,
                errorMessage: '내 순서보다 앞선 모든 단계가 완료되어야 현재 단계를 처리할 수 있습니다.',
            };
        }

        return { isValid: true };
    }

    /**
     * 결재 진행 순서를 검증하고, 실패 시 예외를 던집니다.
     *
     * @throws BadRequestException 검증 실패 시
     */
    static validateApprovalOrderOrThrow(
        currentStepType: ApprovalStepType,
        currentStepOrder: number,
        allSteps: Array<{
            stepType: ApprovalStepType;
            stepOrder: number;
            status: ApprovalStatus;
        }>,
    ): void {
        const result = this.validateApprovalOrder(currentStepType, currentStepOrder, allSteps);
        if (!result.isValid) {
            throw new BadRequestException(result.errorMessage);
        }
    }

    // ==================== 헬퍼 메서드 ====================

    /**
     * 결재자가 처리한 건이 있는지 확인합니다.
     * (상신 취소 검증에 사용)
     *
     * @param steps 모든 결재 단계
     * @returns 결재자가 처리한 건이 있는지 여부
     */
    static hasAnyApprovalProcessed(
        steps: Array<{
            stepType: ApprovalStepType;
            status: ApprovalStatus;
        }>,
    ): boolean {
        return steps.some(
            (step) =>
                step.stepType === ApprovalStepType.APPROVAL &&
                step.status !== ApprovalStatus.PENDING &&
                step.status !== ApprovalStatus.CANCELLED,
        );
    }

    /**
     * 다음 단계가 처리되었는지 확인합니다.
     * (결재 취소 검증에 사용)
     *
     * @param currentStepOrder 현재 단계 순서
     * @param allSteps 모든 결재 단계
     * @returns 다음 단계가 처리되었는지 여부
     */
    static hasNextStepProcessed(
        currentStepOrder: number,
        allSteps: Array<{
            stepOrder: number;
            status: ApprovalStatus;
        }>,
    ): boolean {
        return allSteps.some(
            (step) =>
                step.stepOrder > currentStepOrder &&
                step.status !== ApprovalStatus.PENDING &&
                step.status !== ApprovalStatus.CANCELLED,
        );
    }

    /**
     * 모든 결재가 완료되었는지 확인합니다.
     *
     * @param steps 모든 결재 단계
     * @returns 모든 결재가 완료되었는지 여부
     */
    static isAllApprovalCompleted(
        steps: Array<{
            stepType: ApprovalStepType;
            status: ApprovalStatus;
        }>,
    ): boolean {
        const approvalSteps = steps.filter((s) => s.stepType === ApprovalStepType.APPROVAL);
        return approvalSteps.every((s) => s.status === ApprovalStatus.APPROVED);
    }

    /**
     * 모든 합의가 완료되었는지 확인합니다.
     *
     * @param steps 모든 결재 단계
     * @returns 모든 합의가 완료되었는지 여부
     */
    static isAllAgreementCompleted(
        steps: Array<{
            stepType: ApprovalStepType;
            status: ApprovalStatus;
        }>,
    ): boolean {
        const agreementSteps = steps.filter((s) => s.stepType === ApprovalStepType.AGREEMENT);
        return agreementSteps.length === 0 || agreementSteps.every((s) => s.status === ApprovalStatus.APPROVED);
    }

    /**
     * 모든 시행이 완료되었는지 확인합니다.
     *
     * @param steps 모든 결재 단계
     * @returns 모든 시행이 완료되었는지 여부
     */
    static isAllImplementationCompleted(
        steps: Array<{
            stepType: ApprovalStepType;
            status: ApprovalStatus;
        }>,
    ): boolean {
        const implementationSteps = steps.filter((s) => s.stepType === ApprovalStepType.IMPLEMENTATION);
        return (
            implementationSteps.length === 0 || implementationSteps.every((s) => s.status === ApprovalStatus.APPROVED)
        );
    }

    /**
     * 문서의 다음 상태를 결정합니다.
     *
     * @param currentStatus 현재 문서 상태
     * @param steps 모든 결재 단계
     * @returns 다음 문서 상태 (변경 없으면 null)
     */
    static determineNextDocumentStatus(
        currentStatus: DocumentStatus,
        steps: Array<{
            stepType: ApprovalStepType;
            status: ApprovalStatus;
        }>,
    ): DocumentStatus | null {
        // 결재진행중 → 결재완료: 모든 합의 + 결재가 완료된 경우
        if (currentStatus === DocumentStatus.PENDING) {
            if (this.isAllAgreementCompleted(steps) && this.isAllApprovalCompleted(steps)) {
                return DocumentStatus.APPROVED;
            }
        }

        // 결재완료 → 시행완료: 모든 시행이 완료된 경우
        if (currentStatus === DocumentStatus.APPROVED) {
            if (this.isAllImplementationCompleted(steps)) {
                return DocumentStatus.IMPLEMENTED;
            }
        }

        return null;
    }

    // ==================== 정책 조회 메서드 ====================

    /**
     * 특정 문서 상태에서 기안자가 가능한 액션 목록을 반환합니다.
     */
    static getAllowedDrafterActions(documentStatus: DocumentStatus): DrafterAction[] {
        return [...(this.DRAFTER_ALLOWED_ACTIONS[documentStatus] || [])];
    }

    /**
     * 특정 수신자 역할에서 가능한 문서 상태 목록을 반환합니다.
     */
    static getAllowedDocumentStatuses(stepType: ApprovalStepType): DocumentStatus[] {
        const policy = this.RECEIVER_POLICY[stepType];
        return policy ? [...policy.allowedDocumentStatuses] : [];
    }

    /**
     * 특정 수신자 역할에서 가능한 액션 목록을 반환합니다.
     */
    static getAllowedReceiverActions(stepType: ApprovalStepType): ReceiverAction[] {
        const policy = this.RECEIVER_POLICY[stepType];
        return policy ? [...policy.allowedActions] : [];
    }
}
