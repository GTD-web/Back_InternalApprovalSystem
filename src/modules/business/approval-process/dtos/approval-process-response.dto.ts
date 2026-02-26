import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalStatus, ApprovalStepType, DocumentStatus } from '../../../../common/enums/approval.enum';
import {
    ApprovalStepSnapshotResponseDto,
    ApproverSnapshotMetadataDto,
} from '../../document/dtos/document-response.dto';

/**
 * 결재 처리 응답 DTO (승인/반려/협의/시행/취소)
 */
export class ApprovalActionResponseDto {
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

    @ApiProperty({
        description: '결재 상태',
        enum: ApprovalStatus,
        example: ApprovalStatus.APPROVED,
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
 * 내 결재 대기 목록 응답 DTO
 */
export class PendingApprovalItemDto {
    @ApiProperty({
        description: '결재 단계 스냅샷 ID',
        example: 'uuid',
    })
    stepSnapshotId: string;

    @ApiProperty({
        description: '문서 ID',
        example: 'uuid',
    })
    documentId: string;

    @ApiProperty({
        description: '문서 번호',
        example: 'VAC-2025-0001',
    })
    documentNumber: string;

    @ApiProperty({
        description: '문서 제목',
        example: '휴가 신청서',
    })
    documentTitle: string;

    @ApiProperty({
        description: '기안자 ID',
        example: 'uuid',
    })
    drafterId: string;

    @ApiProperty({
        description: '기안자 이름',
        example: '홍길동',
    })
    drafterName: string;

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
        description: '결재 상태',
        enum: ApprovalStatus,
        example: ApprovalStatus.PENDING,
    })
    status: ApprovalStatus;

    @ApiProperty({
        description: '기안 일시',
        example: '2025-11-11T00:00:00.000Z',
    })
    submittedAt: Date;

    @ApiProperty({
        description: '생성일',
        example: '2025-11-11T00:00:00.000Z',
    })
    createdAt: Date;
}

/**
 * 문서의 결재 단계 목록 응답 DTO
 */
export class DocumentApprovalStepsResponseDto {
    @ApiProperty({
        description: '문서 ID',
        example: 'uuid',
    })
    documentId: string;

    @ApiProperty({
        description: '문서 상태',
        enum: DocumentStatus,
        example: DocumentStatus.PENDING,
    })
    documentStatus: DocumentStatus;

    @ApiProperty({
        description: '결재 단계 목록',
        type: [ApprovalStepSnapshotResponseDto],
    })
    steps: ApprovalStepSnapshotResponseDto[];
}

/**
 * 결재 취소 응답 DTO
 */
export class CancelApprovalResponseDto {
    @ApiProperty({
        description: '문서 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '문서 상태',
        enum: DocumentStatus,
        example: DocumentStatus.CANCELLED,
    })
    status: DocumentStatus;

    @ApiProperty({
        description: '취소 사유',
        example: '내용 수정 필요',
    })
    cancelReason: string;

    @ApiProperty({
        description: '취소 일시',
        example: '2025-11-11T00:00:00.000Z',
    })
    cancelledAt: Date;
}

/**
 * 시행 완료 응답 DTO
 */
export class CompleteImplementationResponseDto extends ApprovalActionResponseDto {
    @ApiPropertyOptional({
        description: '시행 결과 데이터',
        example: { result: '완료', amount: 100000 },
    })
    resultData?: Record<string, any>;
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
 * 현재 처리해야 할 단계 정보 DTO
 */
export class CurrentStepInfoDto {
    @ApiProperty({
        description: '단계 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '단계 순서',
        example: 1,
    })
    stepOrder: number;

    @ApiProperty({
        description: '단계 타입',
        enum: ApprovalStepType,
        example: ApprovalStepType.APPROVAL,
    })
    stepType: ApprovalStepType;

    @ApiProperty({
        description: '결재 상태',
        enum: ApprovalStatus,
        example: ApprovalStatus.PENDING,
    })
    status: ApprovalStatus;

    @ApiProperty({
        description: '결재자 ID',
        example: 'uuid',
    })
    approverId: string;

    @ApiPropertyOptional({
        description: '결재자 정보',
        type: ApproverSnapshotMetadataDto,
    })
    approverSnapshot?: ApproverSnapshotMetadataDto;
}

/**
 * 결재 단계 요약 정보 DTO
 */
export class ApprovalStepSummaryDto {
    @ApiProperty({
        description: '단계 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '단계 순서',
        example: 1,
    })
    stepOrder: number;

    @ApiProperty({
        description: '단계 타입',
        enum: ApprovalStepType,
        example: ApprovalStepType.APPROVAL,
    })
    stepType: ApprovalStepType;

    @ApiProperty({
        description: '결재 상태',
        enum: ApprovalStatus,
        example: ApprovalStatus.PENDING,
    })
    status: ApprovalStatus;

    @ApiProperty({
        description: '결재자 ID',
        example: 'uuid',
    })
    approverId: string;

    @ApiProperty({
        description: '결재자 이름',
        example: '홍길동',
    })
    approverName: string;

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
}

/**
 * 내 대기 문서 항목 DTO (문서 중심)
 */
export class MyPendingDocumentItemDto {
    @ApiProperty({
        description: '문서 ID',
        example: 'uuid',
    })
    documentId: string;

    @ApiProperty({
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
        description: '문서 상태',
        enum: DocumentStatus,
        example: DocumentStatus.PENDING,
    })
    status: DocumentStatus;

    @ApiProperty({
        description: '기안자 ID',
        example: 'uuid',
    })
    drafterId: string;

    @ApiProperty({
        description: '기안자 이름',
        example: '홍길동',
    })
    drafterName: string;

    @ApiPropertyOptional({
        description: '기안자 부서명',
        example: '인사팀',
    })
    drafterDepartmentName?: string;

    @ApiPropertyOptional({
        description: '현재 처리해야 할 단계 정보 (합의/미결일 때만)',
        type: CurrentStepInfoDto,
    })
    currentStep?: CurrentStepInfoDto;

    @ApiProperty({
        description: '전체 결재 단계 목록',
        type: [ApprovalStepSummaryDto],
    })
    approvalSteps: ApprovalStepSummaryDto[];

    @ApiPropertyOptional({
        description: '직전 단계의 승인일 = 내 결재 차례가 시작된 시점 (달력 표시용)',
        example: '2025-11-11T00:00:00.000Z',
    })
    previousStepApprovedAt?: Date;

    @ApiProperty({
        description: '기안(상신) 일시',
        example: '2025-11-11T00:00:00.000Z',
    })
    submittedAt?: Date;

    @ApiProperty({
        description: '생성일',
        example: '2025-11-11T00:00:00.000Z',
    })
    createdAt: Date;
}

/**
 * 페이징된 대기 목록 응답 DTO
 */
export class PaginatedPendingApprovalsResponseDto {
    @ApiProperty({
        description: '대기 문서 목록',
        type: [MyPendingDocumentItemDto],
    })
    data: MyPendingDocumentItemDto[];

    @ApiProperty({
        description: '페이징 메타데이터',
        type: PaginationMetaDto,
    })
    meta: PaginationMetaDto;
}
