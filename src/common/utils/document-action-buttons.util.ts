import { DocumentStatus, ApprovalStatus, ApprovalStepType } from '../enums/approval.enum';

/**
 * 문서 상세 화면에서 노출할 액션 버튼 타입
 * @see document-action-buttons.flow.md
 */
export type DocumentActionButton = 'DRAFT' | 'MODIFY' | 'STEP_PENDING' | 'STEP_APPROVED' | 'IMPLEMENTATION';

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
 * 본인 기준 결재단계 상태 (주어진 단계 배열 내에서만 판단)
 * - 대기중: 이전 x, 나 x, 이후 x
 * - 진행중: 이전 o, 나 x, 이후 x
 * - 완료: 이전 o, 나 o, 이후 x
 * - 종료: 이전 o, 나 o, 이후 o
 */
function getMyStepState(
    steps: Step[],
    userId: string,
): {
    isWaiting: boolean;
    isProgress: boolean;
    isComplete: boolean;
    isEnded: boolean;
    myStep: Step | undefined;
} {
    const sorted = sortByStepOrder(steps);
    const myIndex = sorted.findIndex((s) => s.approverId === userId);
    const myStep = myIndex >= 0 ? sorted[myIndex] : undefined;
    const before = myIndex >= 0 ? sorted.slice(0, myIndex) : [];
    const after = myIndex >= 0 ? sorted.slice(myIndex + 1) : [];

    const allBeforeApproved = before.length === 0 || before.every((s) => s.status === ApprovalStatus.APPROVED);
    const allAfterApproved = after.length > 0 && after.every((s) => s.status === ApprovalStatus.APPROVED);
    const myPending = myStep?.status === ApprovalStatus.PENDING;
    const myApproved = myStep?.status === ApprovalStatus.APPROVED;

    const isWaiting = myPending && !allBeforeApproved;
    const isProgress = myPending && allBeforeApproved;
    const isComplete = myApproved && (after.length === 0 || !allAfterApproved);
    const isEnded = myApproved && after.length > 0 && allAfterApproved;

    return { isWaiting, isProgress, isComplete, isEnded, myStep };
}

/**
 * 문서 단건 조회 시 현재 사용자 기준으로 노출할 액션 버튼 목록 계산
 * @see document-action-buttons.flow.md
 * @param document 문서 (status, drafterId, approvalSteps 포함)
 * @param userId 현재 사용자 ID (없으면 빈 배열 반환)
 * @returns 노출할 버튼 타입 배열 (흐름도 순: DRAFT, MODIFY, STEP_PENDING, STEP_APPROVED, IMPLEMENTATION)
 */
export function getDocumentActionButtons(document: DocumentForActionButtons, userId?: string): DocumentActionButton[] {
    if (!userId) {
        return [];
    }

    const steps = document.approvalSteps ?? [];
    const { agreementOrApproval, implementation, reference } = splitStepsByType(steps);
    const isDrafter = document.drafterId === userId;

    // 합의/결재 · 수신참조 흐름별 상태 (getMyStepState의 isWaiting, isProgress, isComplete, isEnded만 사용)
    const stateAgreementApproval = getMyStepState(agreementOrApproval, userId);

    // 수신참조 흐름 기준: 내 참조 단계 진행중 여부
    const stateReference = getMyStepState(reference, userId);

    const buttons: DocumentActionButton[] = [];

    // 1. DRAFT: 기안자 + 임시저장 → 삭제, 문서상신
    if (document.status === DocumentStatus.DRAFT && isDrafter) {
        buttons.push('DRAFT');
    }

    // 2. MODIFY: 기안자(임시저장) 또는 결재인 + 합의/결재 진행중·완료 → 문서수정
    if (document.status === DocumentStatus.DRAFT && isDrafter) {
        buttons.push('MODIFY');
    } else if (
        document.status === DocumentStatus.PENDING &&
        (stateAgreementApproval.isProgress || stateAgreementApproval.isComplete)
    ) {
        buttons.push('MODIFY');
    }

    // 3. STEP_PENDING: 합의/결재 진행중(내 차례) → 승인·반려
    if (document.status === DocumentStatus.PENDING && stateAgreementApproval.isProgress) {
        buttons.push('STEP_PENDING');
    }

    // 4. STEP_APPROVED: 합의/결재만, 완료(이전 o·나 o·이후 x) → 승인취소
    if (
        (document.status === DocumentStatus.PENDING || document.status === DocumentStatus.APPROVED) &&
        stateAgreementApproval.isComplete
    ) {
        buttons.push('STEP_APPROVED');
    }

    // 5. IMPLEMENTATION: 시행 덩이만, 시행자 + 시행 단계 진행중 → 시행완료
    if (
        document.status === DocumentStatus.APPROVED &&
        implementation.some((s) => s.approverId === userId && s.status === ApprovalStatus.PENDING)
    ) {
        buttons.push('IMPLEMENTATION');
    }

    return buttons;
}
