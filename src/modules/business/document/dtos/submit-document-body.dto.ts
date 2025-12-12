import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApprovalStepSnapshotItemDto } from './approval-step-snapshot.dto';

/**
 * 문서 기안 Body DTO
 * documentId는 URL 파라미터로 받으므로 Body에서 제외
 */
export class SubmitDocumentBodyDto {
    @ApiPropertyOptional({
        description: '문서 템플릿 ID (기안 시점에 지정 가능)',
        example: 'uuid',
    })
    @IsOptional()
    @IsUUID()
    documentTemplateId?: string;

    @ApiPropertyOptional({
        description: '추가 메타데이터 (금액, 날짜 등)',
        example: { amount: 100000, date: '2025-01-01' },
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;

    @ApiPropertyOptional({
        description: '결재단계 스냅샷 목록 (기안 시 결재선 설정, 없으면 기존 스냅샷 사용)',
        type: [ApprovalStepSnapshotItemDto],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ApprovalStepSnapshotItemDto)
    approvalSteps?: ApprovalStepSnapshotItemDto[];
}
