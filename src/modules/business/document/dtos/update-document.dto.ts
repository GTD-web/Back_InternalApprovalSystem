import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateApprovalStepSnapshotItemDto } from './update-approval-step-snapshot.dto';

/**
 * 문서 수정 DTO
 */
export class UpdateDocumentDto {
    @ApiPropertyOptional({
        description: '문서 제목',
        example: '휴가 신청서',
    })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({
        description: '문서 내용 (HTML 형태)',
        example: '<html>...</html>',
    })
    @IsOptional()
    @IsString()
    content?: string;

    @ApiPropertyOptional({
        description: '추가 메타데이터 (금액, 날짜 등)',
        example: { amount: 100000, date: '2025-01-01' },
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;

    @ApiPropertyOptional({
        description: '문서 수정 코멘트',
        example: '금액 수정',
    })
    @IsOptional()
    @IsString()
    comment?: string;

    @ApiPropertyOptional({
        description: '결재단계 스냅샷 목록 (id가 있으면 수정, 없으면 생성, 기존 것 중 요청에 없는 것은 삭제)',
        type: [UpdateApprovalStepSnapshotItemDto],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateApprovalStepSnapshotItemDto)
    approvalSteps?: UpdateApprovalStepSnapshotItemDto[];
}
