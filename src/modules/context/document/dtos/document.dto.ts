import { DocumentStatus, ApprovalStepType } from '../../../../common/enums/approval.enum';

/**
 * 결재단계 스냅샷 항목 DTO (컨텍스트용)
 * approverSnapshot은 서버에서 approverId를 기반으로 자동 생성됩니다.
 */
export class ApprovalStepSnapshotItemDto {
    stepOrder: number;
    stepType: ApprovalStepType;
    approverId: string;
    id?: string; // 수정 시 필요
}

/**
 * 페이징 옵션 DTO
 */
export class PaginationOptionsDto {
    page: number;
    limit: number;
}

/**
 * 문서 생성 DTO
 */
export class CreateDocumentDto {
    documentTemplateId?: string; // 선택사항: 템플릿 없는 외부 문서 지원
    title: string;
    content: string; // HTML 형태
    drafterId: string;
    metadata?: Record<string, any>; // 추가 메타데이터 (금액, 날짜 등)
    approvalSteps?: ApprovalStepSnapshotItemDto[]; // 결재단계 스냅샷 목록
}

/**
 * 문서 수정 DTO
 */
export class UpdateDocumentDto {
    title?: string;
    content?: string;
    metadata?: Record<string, any>; // 추가 메타데이터 (금액, 날짜 등)
    comment?: string; // 문서 수정 코멘트
    status?: DocumentStatus; // 상태 업데이트용
    approvalSteps?: ApprovalStepSnapshotItemDto[]; // 결재단계 스냅샷 목록 (id가 있으면 수정, 없으면 생성)
}

/**
 * 문서 기안 DTO
 * 임시저장된 문서를 기안합니다.
 */
export class SubmitDocumentDto {
    documentId: string; // 기안할 문서 ID (임시저장된 문서)
    documentTemplateId?: string; // 문서 템플릿 ID (기안 시점에 지정 가능)
    approvalSteps?: ApprovalStepSnapshotItemDto[]; // 결재단계 스냅샷 목록 (기안 시 결재선 설정)
}

/**
 * 상신취소 DTO (기안자용)
 * 정책: 결재진행중이고 결재자가 아직 어떤 처리도 하지 않은 상태일 때만 가능
 */
export class CancelSubmitDto {
    documentId: string; // 취소할 문서 ID
    drafterId: string; // 기안자 ID
    reason: string; // 취소 사유
}

/**
 * 문서 조회 필터 DTO
 *
 * 필터링 조건 가이드:
 *
 * === 내가 기안한 문서 (drafterId 지정) ===
 * 1. 임시저장: status=DRAFT, pendingStepType 미지정
 * 2. 전체 상신: status 미지정, pendingStepType 미지정
 * 3. 협의 대기: status=PENDING, pendingStepType=AGREEMENT
 * 4. 미결 대기: status=PENDING, pendingStepType=APPROVAL
 * 5. 기결: status=APPROVED, pendingStepType 미지정
 * 6. 반려: status=REJECTED, pendingStepType 미지정
 * 7. 시행: status=IMPLEMENTED, pendingStepType 미지정
 *
 * === 내가 참조자로 있는 문서 (referenceUserId 지정) ===
 * 8. 참조: referenceUserId만 지정, status 미지정, pendingStepType 미지정
 *
 * 주의: drafterId와 referenceUserId는 상호 배타적 (referenceUserId 우선)
 */
export class DocumentFilterDto {
    status?: DocumentStatus; // 문서 상태 (DRAFT, PENDING, APPROVED, REJECTED, IMPLEMENTED)
    pendingStepType?: ApprovalStepType; // PENDING 상태일 때 현재 단계 타입 (AGREEMENT=협의, APPROVAL=미결)
    drafterId?: string; // 기안자 ID (내가 기안한 문서)
    referenceUserId?: string; // 참조자 ID (내가 참조자로 있는 문서, status 무관)
    categoryId?: string;
    documentTemplateId?: string;
    startDate?: Date;
    endDate?: Date;
    searchKeyword?: string;
    page?: number;
    limit?: number;
}
