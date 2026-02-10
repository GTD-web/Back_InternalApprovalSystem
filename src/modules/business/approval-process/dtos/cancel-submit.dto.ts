import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional } from 'class-validator';

/**
 * 상신취소 요청 DTO (기안자용)
 * 정책: 결재 진행 중(PENDING) 문서만 취소 가능, 기안자만 호출 가능. 사유 없으면 기본값 저장.
 */
export class CancelSubmitDto {
    @ApiProperty({
        description: '문서 ID',
        example: 'uuid',
    })
    @IsUUID()
    documentId: string;

    @ApiPropertyOptional({
        description: '취소 사유 (없으면 기본값 저장)',
        example: '내용 수정이 필요하여 상신을 취소합니다.',
    })
    @IsOptional()
    @IsString()
    reason?: string;
}
