import { ApprovalStepType, ApprovalStatus } from '../../../../common/enums/approval.enum';

/**
 * 결재 승인 DTO
 */
export class ApproveStepDto {
    stepSnapshotId: string;
    approverId: string;
    comment?: string;
}

/**
 * 결재취소 응답 DTO
 * isDrafterFirstApprover: true이면 비즈니스 레이어에서 상신취소(상신을취소한다) 호출 필요
 */
export class CancelApprovalStepResultDto {
    stepSnapshotId: string;
    documentId: string;
    message: string;
    isDrafterFirstApprover?: boolean;
}

/**
 * 결재 반려 DTO
 */
export class RejectStepDto {
    stepSnapshotId: string;
    approverId: string;
    comment: string; // 반려 사유는 필수
}

/**
 * 협의 완료 DTO
 */
export class CompleteAgreementDto {
    documentId: string;
    agreerId: string;
    comment?: string;
}

/**
 * 시행 완료 DTO
 */
export class CompleteImplementationDto {
    stepSnapshotId: string;
    implementerId: string;
    comment?: string;
    resultData?: Record<string, any>; // 시행 결과 데이터
}

/**
 * 상신취소 DTO (기안자용)
 * 정책: 결재 진행 중(PENDING) 문서만 취소 가능, 기안자만 호출 가능
 */
export class CancelSubmitDto {
    documentId: string;
    drafterId: string; // 기안자 ID (보통 로그인 사용자 ID)
    reason?: string; // 취소 사유 (없으면 기본값 저장)
}

/**
 * 결재취소 DTO (결재자용)
 * 정책: 본인이 승인한 상태이고, 다음 단계가 처리되지 않은 상태에서만 가능
 */
export class CancelApprovalStepDto {
    stepSnapshotId: string; // 취소할 결재 단계 ID
    approverId: string; // 결재자 ID
    reason?: string; // 취소 사유 (선택)
}

/**
 * @deprecated 상신취소(CancelSubmitDto)와 결재취소(CancelApprovalStepDto)로 분리됨
 */
export class CancelApprovalDto {
    documentId: string;
    requesterId: string;
    reason: string;
}

/**
 * 결재선 조회 필터 DTO
 */
export class ApprovalStepFilterDto {
    documentId?: string;
    approverId?: string;
    status?: ApprovalStatus;
    stepType?: ApprovalStepType;
}
