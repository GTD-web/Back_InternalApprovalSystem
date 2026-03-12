import { DocumentStatus, ApprovalStatus, ApprovalStepType } from '../enums/approval.enum';

/**
 * 문서 상세 화면에서 노출할 액션 버튼 타입
 * @see document-action-buttons.flow.md
 */
export type DocumentActionButton = 'DRAFT' | 'MODIFY' | 'STEP_PENDING' | 'STEP_APPROVED' | 'IMPLEMENTATION';

/** 스탭(또는 문서) 단위로 구분된 액션 버튼 응답 */
export interface DocumentActionButtonsByStepDto {
    id: string;
    buttons: DocumentActionButton[];
}

/** 유틸 입력용 문서 최소 형태 (approvalSteps는 stepOrder ASC 가정) */
export interface DocumentForActionButtons {
    status: DocumentStatus;
    drafterId: string;
    approvalSteps?: Array<{
        id: string;
        approverId: string;
        status: ApprovalStatus;
        stepOrder: number;
        stepType: ApprovalStepType;
    }>;
}

type Step = NonNullable<DocumentForActionButtons['approvalSteps']>[number];

/** stepOrder 기준 정렬된 배열 반환 */
function sortByStepOrder(steps: Step[]): Step[] {
    return steps.slice().sort((a, b) => a.stepOrder - b.stepOrder);
}

/**
 * 합의/결재 · 시행 · 수신참조 세 덩이로 분리
 * 검증 시 각 흐름별로 순서·상태를 나눠서 사용
 */
function splitStepsByType(steps: Step[]): {
    agreementOrApproval: Step[];
    implementation: Step[];
    reference: Step[];
} {
    const sorted = sortByStepOrder(steps);
    const agreementOrApproval = sorted.filter(
        (s) => s.stepType === ApprovalStepType.AGREEMENT || s.stepType === ApprovalStepType.APPROVAL,
    );
    const implementation = sorted.filter((s) => s.stepType === ApprovalStepType.IMPLEMENTATION);
    const reference = sorted.filter((s) => s.stepType === ApprovalStepType.REFERENCE);
    return { agreementOrApproval, implementation, reference };
}

/**
 * 단계 하나에 대해 "이전 승인 여부" 계산 (합의는 이전 결재단계만, 그 외는 이전 전체)
 */
function isAllBeforeApprovedForStep(before: Step[], step: Step): boolean {
    if (before.length === 0) return true;
    return step.stepType === ApprovalStepType.AGREEMENT
        ? before
              .filter((s) => s.stepType === ApprovalStepType.APPROVAL)
              .every((s) => s.status === ApprovalStatus.APPROVED)
        : before.every((s) => s.status === ApprovalStatus.APPROVED);
}

/**
 * 단계 하나의 상태 (대기중/진행중/완료/종료)
 */
export interface MyStepStateItem {
    step: Step;
    isWaiting: boolean;
    isProgress: boolean;
    isComplete: boolean;
    isEnded: boolean;
}

/**
 * 본인 기준 결재단계 상태 — 스탭별로 개별 반환 (OR 합치지 않음)
 * - 대기중: 이전 x, 나 x, 이후 x
 * - 진행중: 이전 o, 나 x, 이후 x
 * - 완료: 이전 o, 나 o, 이후 x
 * - 종료: 이전 o, 나 o, 이후 o
 * 합의(AGREEMENT): "이전 o" = 이전 결재단계(APPROVAL)만 승인.
 */
function getMyStepStates(steps: Step[], userId: string): MyStepStateItem[] {
    const sorted = sortByStepOrder(steps);
    const myIndices = sorted.map((s, i) => (s.approverId === userId ? i : -1)).filter((i) => i >= 0);
    const result: MyStepStateItem[] = [];

    for (const idx of myIndices) {
        const step = sorted[idx];
        const before = sorted.slice(0, idx);
        const after = sorted.slice(idx + 1);
        const allBeforeApproved = isAllBeforeApprovedForStep(before, step);
        const allAfterApproved = after.length > 0 && after.every((s) => s.status === ApprovalStatus.APPROVED);
        const myPending = step.status === ApprovalStatus.PENDING;
        const myApproved = step.status === ApprovalStatus.APPROVED;

        result.push({
            step,
            isWaiting: myPending && !allBeforeApproved,
            isProgress: myPending && allBeforeApproved,
            isComplete: myApproved && (after.length === 0 || !allAfterApproved),
            isEnded: myApproved && after.length > 0 && allAfterApproved,
        });
    }
    return result;
}

/**
 * 문서 단건 조회 시 현재 사용자 기준으로 노출할 액션 버튼을 스탭(또는 문서) 단위로 계산
 * @see document-action-buttons.flow.md
 * @param document 문서 (status, drafterId, approvalSteps 포함)
 * @param userId 현재 사용자 ID (없으면 빈 배열 반환)
 * @returns [{ id, buttons }] — id는 step.id 또는 "document"(문서 레벨 버튼)
 */
export function getDocumentActionButtons(
    document: DocumentForActionButtons,
    userId?: string,
): DocumentActionButtonsByStepDto[] {
    if (!userId) {
        return [];
    }

    const steps = document.approvalSteps ?? [];
    const { agreementOrApproval, implementation } = splitStepsByType(steps);
    const isDrafter = document.drafterId === userId;
    const stepStates = getMyStepStates(agreementOrApproval, userId);
    const result: DocumentActionButtonsByStepDto[] = [];

    // 문서 레벨: 임시저장 + 기안자 → DRAFT, MODIFY
    if (document.status === DocumentStatus.DRAFT && isDrafter) {
        result.push({ id: 'document', buttons: ['DRAFT', 'MODIFY'] });
    }

    // 합의/결재 스탭별 버튼
    for (const { step, isProgress, isComplete } of stepStates) {
        const buttons: DocumentActionButton[] = [];
        if (document.status === DocumentStatus.PENDING && isProgress) {
            buttons.push('MODIFY', 'STEP_PENDING');
        } else if (
            (document.status === DocumentStatus.PENDING || document.status === DocumentStatus.APPROVED) &&
            isComplete
        ) {
            buttons.push('MODIFY', 'STEP_APPROVED');
        }
        if (buttons.length > 0) {
            result.push({ id: step.id, buttons });
        }
    }

    // 시행 스탭별: 결재완료 문서에서 내 시행 단계가 대기 중일 때
    if (document.status === DocumentStatus.APPROVED) {
        for (const step of implementation) {
            if (step.approverId === userId && step.status === ApprovalStatus.PENDING) {
                result.push({ id: step.id, buttons: ['IMPLEMENTATION'] });
            }
        }
    }

    return result;
}
