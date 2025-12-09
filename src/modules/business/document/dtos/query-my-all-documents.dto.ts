import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 문서 필터 타입 Enum (통계와 동일한 구분)
 */
export enum MyAllDocumentFilterType {
    /** 임시저장 (내가 기안한 문서 중 DRAFT 상태) */
    DRAFT = 'DRAFT',
    /** 수신함 (내가 결재라인에 있는 모든 받은 문서) */
    RECEIVED = 'RECEIVED',
    /** 상신함 (내가 기안한 제출된 전체 문서) */
    PENDING = 'PENDING',
    /** 합의함 (내가 협의자로 결재라인에 있는 문서, PENDING 상태) */
    PENDING_AGREEMENT = 'PENDING_AGREEMENT',
    /** 결재함 (내가 결재자로 결재라인에 있는 문서, PENDING 상태) */
    PENDING_APPROVAL = 'PENDING_APPROVAL',
    /** 시행함 (내가 시행자로 결재라인에 있는 문서, APPROVED 상태 - 결재 완료, 시행 대기) */
    IMPLEMENTATION = 'IMPLEMENTATION',
    /** 기결함 (내가 기안한 문서 중 IMPLEMENTED 상태 - 시행까지 완료) */
    APPROVED = 'APPROVED',
    /** 반려함 (내가 기안한 문서 중 REJECTED 상태) */
    REJECTED = 'REJECTED',
    /** 수신참조함 (내가 참조자로 있는 문서) */
    RECEIVED_REFERENCE = 'RECEIVED_REFERENCE',
}

/**
 * 수신함 단계 타입 필터 Enum (RECEIVED에만 적용)
 */
export enum ReceivedStepType {
    /** 합의 단계 */
    AGREEMENT = 'AGREEMENT',
    /** 결재 단계 */
    APPROVAL = 'APPROVAL',
}

/**
 * 기안자 필터 Enum (APPROVED, REJECTED에만 적용)
 */
export enum DrafterFilter {
    /** 내가 기안한 문서만 */
    MY_DRAFT = 'MY_DRAFT',
    /** 내가 참여한 문서만 (기안자가 아닌 경우) */
    PARTICIPATED = 'PARTICIPATED',
}

/**
 * 참조 문서 열람 여부 필터 Enum (수신참조함에만 적용)
 */
export enum ReferenceReadStatus {
    /** 열람함 (status = APPROVED) */
    READ = 'READ',
    /** 미열람 (status = PENDING) */
    UNREAD = 'UNREAD',
}

/**
 * 상신함 문서 상태 필터 Enum (PENDING에만 적용)
 */
export enum PendingStatusFilter {
    /** 결재 진행중 */
    PENDING = 'PENDING',
    /** 결재 완료 */
    APPROVED = 'APPROVED',
    /** 반려됨 */
    REJECTED = 'REJECTED',
    /** 취소됨 */
    CANCELLED = 'CANCELLED',
    /** 시행 완료 */
    IMPLEMENTED = 'IMPLEMENTED',
}

/**
 * 정렬 순서 Enum
 */
export enum SortOrder {
    /** 최신순 (createdAt DESC) */
    LATEST = 'LATEST',
    /** 오래된순 (createdAt ASC) */
    OLDEST = 'OLDEST',
}

/**
 * 내가 작성한 문서 + 내가 결재해야하는 문서 목록 조회 쿼리 DTO
 *
 * === 필터링 조건 가이드 ===
 *
 * ▣ 필터 타입 (filterType) - 통계와 동일한 구분
 * - DRAFT: 임시저장 (내가 기안한 문서)
 * - RECEIVED: 수신함 (내가 합의/결재 라인에 있는 받은 문서, 시행/참조 제외)
 * - PENDING: 상신함 (내가 기안한 제출된 전체 문서)
 * - PENDING_AGREEMENT: 합의함
 * - PENDING_APPROVAL: 결재함
 * - IMPLEMENTATION: 시행함
 * - APPROVED: 기결함
 * - REJECTED: 반려함
 * - RECEIVED_REFERENCE: 수신참조함 (IMPLEMENTED 상태만)
 *
 * ▣ 수신함 단계 타입 필터 (receivedStepType) - RECEIVED에만 적용
 * - AGREEMENT: 합의 단계로 수신한 문서만
 * - APPROVAL: 결재 단계로 수신한 문서만
 *
 * ▣ 기안자 필터 (drafterFilter) - APPROVED, REJECTED에만 적용
 * - MY_DRAFT: 내가 기안한 문서만
 * - PARTICIPATED: 내가 참여한 문서만 (기안자가 아닌 경우)
 *
 * ▣ 참조 문서 열람 여부 필터 (referenceReadStatus) - RECEIVED_REFERENCE에만 적용
 * - READ: 열람함 (status = APPROVED)
 * - UNREAD: 미열람 (status = PENDING)
 *
 * ▣ 추가 필터링 옵션
 * - searchKeyword: 문서 제목 또는 템플릿 이름 검색
 * - startDate, endDate: 제출일 구분
 * - sortOrder: 정렬 순서 (LATEST: 최신순, OLDEST: 오래된순)
 */
export class QueryMyAllDocumentsDto {
    @ApiPropertyOptional({
        description:
            '문서 필터 타입 (통계와 동일한 구분)\n' +
            '- DRAFT: 임시저장\n' +
            '- RECEIVED: 수신함 (내가 합의/결재 라인에 있는 받은 문서, 시행/참조 제외)\n' +
            '- PENDING: 상신함\n' +
            '- PENDING_AGREEMENT: 합의함\n' +
            '- PENDING_APPROVAL: 결재함\n' +
            '- IMPLEMENTATION: 시행함\n' +
            '- APPROVED: 기결함\n' +
            '- REJECTED: 반려함\n' +
            '- RECEIVED_REFERENCE: 수신참조함 (IMPLEMENTED 상태만)',
        enum: MyAllDocumentFilterType,
        example: MyAllDocumentFilterType.PENDING_APPROVAL,
    })
    @IsOptional()
    @IsEnum(MyAllDocumentFilterType)
    filterType?: MyAllDocumentFilterType;

    @ApiPropertyOptional({
        description:
            '수신함 단계 타입 필터 (RECEIVED에만 적용)\n' +
            '- AGREEMENT: 합의 단계로 수신한 문서만\n' +
            '- APPROVAL: 결재 단계로 수신한 문서만',
        enum: ReceivedStepType,
        example: ReceivedStepType.APPROVAL,
    })
    @IsOptional()
    @IsEnum(ReceivedStepType)
    receivedStepType?: ReceivedStepType;

    @ApiPropertyOptional({
        description:
            '기안자 필터 (APPROVED, REJECTED에만 적용)\n' +
            '- MY_DRAFT: 내가 기안한 문서만\n' +
            '- PARTICIPATED: 내가 참여한 문서만 (기안자가 아닌 경우)',
        enum: DrafterFilter,
        example: DrafterFilter.MY_DRAFT,
    })
    @IsOptional()
    @IsEnum(DrafterFilter)
    drafterFilter?: DrafterFilter;

    @ApiPropertyOptional({
        description:
            '참조 문서 열람 여부 필터 (RECEIVED_REFERENCE에만 적용)\n' +
            '- READ: 열람함 (status = APPROVED)\n' +
            '- UNREAD: 미열람 (status = PENDING)',
        enum: ReferenceReadStatus,
        example: ReferenceReadStatus.UNREAD,
    })
    @IsOptional()
    @IsEnum(ReferenceReadStatus)
    referenceReadStatus?: ReferenceReadStatus;

    @ApiPropertyOptional({
        description:
            '상신함 문서 상태 필터 (PENDING에만 적용)\n' +
            '- PENDING: 결재 진행중\n' +
            '- APPROVED: 결재 완료\n' +
            '- REJECTED: 반려됨\n' +
            '- CANCELLED: 취소됨\n' +
            '- IMPLEMENTED: 시행 완료\n' +
            '- 미지정: DRAFT를 제외한 모든 상태',
        enum: PendingStatusFilter,
        example: PendingStatusFilter.PENDING,
    })
    @IsOptional()
    @IsEnum(PendingStatusFilter)
    pendingStatusFilter?: PendingStatusFilter;

    @ApiPropertyOptional({
        description: '검색어 (문서 제목 또는 템플릿 이름)',
        example: '휴가',
    })
    @IsOptional()
    @IsString()
    searchKeyword?: string;

    @ApiPropertyOptional({
        description: '제출 시작 날짜 (YYYY-MM-DD)',
        example: '2025-01-01',
    })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiPropertyOptional({
        description: '제출 종료 날짜 (YYYY-MM-DD)',
        example: '2025-12-31',
    })
    @IsOptional()
    @IsString()
    endDate?: string;

    @ApiPropertyOptional({
        description: '정렬 순서\n- LATEST: 최신순 (기본값)\n- OLDEST: 오래된순',
        enum: SortOrder,
        example: SortOrder.LATEST,
        default: SortOrder.LATEST,
    })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.LATEST;

    @ApiPropertyOptional({
        description: '페이지 번호 (1부터 시작)',
        example: 1,
        default: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: '페이지당 항목 수',
        example: 20,
        default: 20,
        minimum: 1,
        maximum: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}
