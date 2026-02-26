import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus, ApprovalStepType, ApprovalStatus } from '../../../../common/enums/approval.enum';
import { DocumentActionButton } from '../../../../common/utils/document-action-buttons.util';

/**
 * 결재자 스냅샷 메타데이터 DTO
 */
export class ApproverSnapshotMetadataDto {
    @ApiPropertyOptional({
        description: '부서 ID',
        example: 'uuid',
    })
    departmentId?: string;

    @ApiPropertyOptional({
        description: '부서명',
        example: '개발팀',
    })
    departmentName?: string;

    @ApiPropertyOptional({
        description: '직책 ID',
        example: 'uuid',
    })
    positionId?: string;

    @ApiPropertyOptional({
        description: '직책명',
        example: '팀장',
    })
    positionTitle?: string;

    @ApiPropertyOptional({
        description: '직급 ID',
        example: 'uuid',
    })
    rankId?: string;

    @ApiPropertyOptional({
        description: '직급명',
        example: '과장',
    })
    rankTitle?: string;

    @ApiPropertyOptional({
        description: '직원명',
        example: '홍길동',
    })
    employeeName?: string;

    @ApiPropertyOptional({
        description: '사번',
        example: 'EMP001',
    })
    employeeNumber?: string;
}

/**
 * 결재 단계 스냅샷 응답 DTO
 */
export class ApprovalStepSnapshotResponseDto {
    @ApiProperty({
        description: '결재 단계 스냅샷 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '문서 ID',
        example: 'uuid',
    })
    documentId: string;

    @ApiProperty({
        description: '결재 단계 순서',
        example: 1,
    })
    stepOrder: number;

    @ApiProperty({
        description: '결재 단계 타입',
        enum: ApprovalStepType,
        example: ApprovalStepType.APPROVAL,
    })
    stepType: ApprovalStepType;

    @ApiProperty({
        description: '결재자 ID',
        example: 'uuid',
    })
    approverId: string;

    @ApiPropertyOptional({
        description: '결재자 스냅샷 정보',
        type: ApproverSnapshotMetadataDto,
    })
    approverSnapshot?: ApproverSnapshotMetadataDto;

    @ApiProperty({
        description: '결재 상태',
        enum: ApprovalStatus,
        example: ApprovalStatus.PENDING,
    })
    status: ApprovalStatus;

    @ApiPropertyOptional({
        description: '결재 의견',
        example: '승인합니다.',
    })
    comment?: string;

    @ApiPropertyOptional({
        description: '결재 완료 시간',
        example: '2025-11-11T00:00:00.000Z',
    })
    approvedAt?: Date;

    @ApiProperty({
        description: '생성일',
        example: '2025-11-11T00:00:00.000Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: '수정일',
        example: '2025-11-11T00:00:00.000Z',
    })
    updatedAt: Date;
}

/**
 * 카테고리 응답 DTO (간단 버전)
 */
class CategorySimpleDto {
    @ApiProperty({
        description: '카테고리 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '카테고리 이름',
        example: '인사',
    })
    name: string;

    @ApiProperty({
        description: '카테고리 코드',
        example: 'HR',
    })
    code: string;

    @ApiPropertyOptional({
        description: '카테고리 설명',
        example: '인사 관련 문서',
    })
    description?: string;

    @ApiProperty({
        description: '정렬 순서',
        example: 1,
    })
    order: number;
}

/**
 * 문서 템플릿 응답 DTO (간단 버전)
 */
export class DocumentTemplateSimpleResponseDto {
    @ApiProperty({
        description: '문서 템플릿 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '문서 템플릿 이름',
        example: '휴가 신청서',
    })
    name: string;

    @ApiProperty({
        description: '문서 템플릿 코드',
        example: 'VACATION',
    })
    code: string;

    @ApiPropertyOptional({
        description: '카테고리 정보',
        type: CategorySimpleDto,
    })
    category?: CategorySimpleDto;
}

/**
 * 부서 정보 DTO (간단 버전)
 */
export class DepartmentSimpleDto {
    @ApiProperty({
        description: '부서 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '부서명',
        example: '개발팀',
    })
    departmentName: string;

    @ApiProperty({
        description: '부서 코드',
        example: 'DEV',
    })
    departmentCode: string;
}

/**
 * 직책 정보 DTO (간단 버전)
 */
export class PositionSimpleDto {
    @ApiProperty({
        description: '직책 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '직책명',
        example: '팀장',
    })
    positionTitle: string;

    @ApiProperty({
        description: '직책 코드',
        example: 'MANAGER',
    })
    positionCode: string;

    @ApiProperty({
        description: '직책 레벨',
        example: 3,
    })
    level: number;
}

/**
 * 직급 정보 DTO (간단 버전)
 */
export class RankSimpleDto {
    @ApiProperty({
        description: '직급 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '직급명',
        example: '과장',
    })
    rankTitle: string;

    @ApiProperty({
        description: '직급 코드',
        example: 'MANAGER',
    })
    rankCode: string;
}

/**
 * 기안자 정보 DTO
 */
export class DrafterSimpleDto {
    @ApiProperty({
        description: '기안자 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '기안자 사번',
        example: 'EMP001',
    })
    employeeNumber: string;

    @ApiProperty({
        description: '기안자 이름',
        example: '홍길동',
    })
    name: string;

    @ApiProperty({
        description: '기안자 이메일',
        example: 'hong@example.com',
    })
    email: string;

    @ApiPropertyOptional({
        description: '기안자 부서 정보',
        type: DepartmentSimpleDto,
    })
    department?: DepartmentSimpleDto;

    @ApiPropertyOptional({
        description: '기안자 직책 정보',
        type: PositionSimpleDto,
    })
    position?: PositionSimpleDto;

    @ApiPropertyOptional({
        description: '기안자 직급 정보',
        type: RankSimpleDto,
    })
    rank?: RankSimpleDto;
}

/**
 * 문서 응답 DTO
 */
export class DocumentResponseDto {
    @ApiProperty({
        description: '문서 ID',
        example: 'uuid',
    })
    id: string;

    @ApiPropertyOptional({
        description: '문서 번호',
        example: 'VAC-2025-0001',
    })
    documentNumber?: string;

    @ApiProperty({
        description: '문서 제목',
        example: '휴가 신청서',
    })
    title: string;

    @ApiProperty({
        description: '문서 내용 (HTML)',
        example: '<html>...</html>',
    })
    content: string;

    @ApiProperty({
        description: '문서 상태',
        enum: DocumentStatus,
        example: DocumentStatus.DRAFT,
    })
    status: DocumentStatus;

    @ApiPropertyOptional({
        description: '문서 비고',
        example: '비고 내용',
    })
    comment?: string;

    @ApiPropertyOptional({
        description: '문서 메타데이터',
        example: { amount: 100000, date: '2025-01-01' },
    })
    metadata?: Record<string, any>;

    @ApiProperty({
        description: '기안자 ID',
        example: 'uuid',
    })
    drafterId: string;

    @ApiPropertyOptional({
        description: '기안자 정보',
        type: DrafterSimpleDto,
    })
    drafter?: DrafterSimpleDto;

    @ApiPropertyOptional({
        description: '문서 템플릿 ID',
        example: 'uuid',
    })
    documentTemplateId?: string;

    @ApiPropertyOptional({
        description: '문서 템플릿 정보',
        type: DocumentTemplateSimpleResponseDto,
    })
    documentTemplate?: DocumentTemplateSimpleResponseDto;

    @ApiPropertyOptional({
        description: '보존 연한',
        example: '10년',
    })
    retentionPeriod?: string;

    @ApiPropertyOptional({
        description: '보존 연한 단위',
        example: '년',
    })
    retentionPeriodUnit?: string;

    @ApiPropertyOptional({
        description: '보존 연한 시작일',
        example: '2025-01-01',
    })
    retentionStartDate?: Date;

    @ApiPropertyOptional({
        description: '보존 연한 종료일',
        example: '2035-01-01',
    })
    retentionEndDate?: Date;

    @ApiPropertyOptional({
        description: '기안(상신) 일시',
        example: '2025-11-11T00:00:00.000Z',
    })
    submittedAt?: Date;

    @ApiPropertyOptional({
        description: '취소 사유',
        example: '내용 수정 필요',
    })
    cancelReason?: string;

    @ApiPropertyOptional({
        description: '취소 일시',
        example: '2025-11-11T00:00:00.000Z',
    })
    cancelledAt?: Date;

    @ApiPropertyOptional({
        description: '결재 완료 일시',
        example: '2025-11-11T00:00:00.000Z',
    })
    approvedAt?: Date;

    @ApiPropertyOptional({
        description: '반려 일시',
        example: '2025-11-11T00:00:00.000Z',
    })
    rejectedAt?: Date;

    @ApiProperty({
        description: '생성일',
        example: '2025-11-11T00:00:00.000Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: '수정일',
        example: '2025-11-11T00:00:00.000Z',
    })
    updatedAt: Date;

    @ApiPropertyOptional({
        description: '결재 단계 스냅샷 목록',
        type: [ApprovalStepSnapshotResponseDto],
    })
    approvalSteps?: ApprovalStepSnapshotResponseDto[];

    @ApiPropertyOptional({
        description:
            '현재 사용자 기준 노출 액션 버튼 목록 (로그인 사용자 조회 시에만 포함). DRAFT, MODIFY, STEP_PENDING, STEP_APPROVED, IMPLEMENTATION',
        enum: ['DRAFT', 'MODIFY', 'STEP_PENDING', 'STEP_APPROVED', 'IMPLEMENTATION'],
        isArray: true,
        example: ['MODIFY', 'STEP_PENDING'],
    })
    actionButtons?: DocumentActionButton[];
}

/**
 * 문서 제출 응답 DTO
 */
export class SubmitDocumentResponseDto {
    @ApiProperty({
        description: '문서 정보',
        type: DocumentResponseDto,
    })
    document: DocumentResponseDto;

    @ApiProperty({
        description: '결재 단계 스냅샷 목록',
        type: [ApprovalStepSnapshotResponseDto],
    })
    approvalSteps: ApprovalStepSnapshotResponseDto[];
}

/**
 * 페이징 메타데이터 DTO
 */
export class PaginationMetaDto {
    @ApiProperty({
        description: '현재 페이지',
        example: 1,
    })
    currentPage: number;

    @ApiProperty({
        description: '페이지당 항목 수',
        example: 20,
    })
    itemsPerPage: number;

    @ApiProperty({
        description: '전체 항목 수',
        example: 100,
    })
    totalItems: number;

    @ApiProperty({
        description: '전체 페이지 수',
        example: 5,
    })
    totalPages: number;

    @ApiProperty({
        description: '다음 페이지 존재 여부',
        example: true,
    })
    hasNextPage: boolean;

    @ApiProperty({
        description: '이전 페이지 존재 여부',
        example: false,
    })
    hasPreviousPage: boolean;
}

/**
 * 페이징된 문서 목록 응답 DTO
 */
export class PaginatedDocumentsResponseDto {
    @ApiProperty({
        description: '문서 목록',
        type: [DocumentResponseDto],
    })
    data: DocumentResponseDto[];

    @ApiProperty({
        description: '페이징 메타데이터',
        type: PaginationMetaDto,
    })
    meta: PaginationMetaDto;
}
