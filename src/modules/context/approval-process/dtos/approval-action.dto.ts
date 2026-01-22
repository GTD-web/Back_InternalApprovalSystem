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
 */
export class CancelApprovalStepResultDto {
    stepSnapshotId: string;
    documentId: string;
    message: string;
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
 * 정책: 결재진행중이고 결재자가 아직 어떤 처리도 하지 않은 상태일 때만 가능
 */
export class CancelSubmitDto {
    documentId: string;
    drafterId: string; // 기안자 ID
    reason: string; // 취소 사유
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
