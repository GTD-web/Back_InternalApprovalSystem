import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

/**
 * 결재 액션 타입
 */
export enum ApprovalActionType {
    APPROVE = 'approve',
    REJECT = 'reject',
    COMPLETE_AGREEMENT = 'complete-agreement',
    COMPLETE_IMPLEMENTATION = 'complete-implementation',
    MARK_REFERENCE_READ = 'mark-reference-read',
    CANCEL = 'cancel',
}

/**
 * 통합 결재 액션 처리 DTO
 * 승인, 반려, 협의 완료, 시행 완료, 취소를 하나의 API로 처리합니다.
 */
export class ProcessApprovalActionDto {
    @ApiPropertyOptional({
        description:
            '결재 단계 스냅샷 ID (approve, reject, complete-agreement, complete-implementation, mark-reference-read 타입에서 필수)',
        example: 'uuid',
    })
    @IsOptional()
    @IsUUID()
    stepSnapshotId?: string;
}
