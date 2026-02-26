import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional } from 'class-validator';

/**
 * 협의 완료 DTO
 */
export class CompleteAgreementDto {
    @ApiProperty({
        description: '문서 ID',
        example: 'uuid',
    })
    @IsUUID()
    documentId: string;

    @ApiPropertyOptional({
        description: '협의 의견',
        example: '협의 완료합니다.',
    })
    @IsOptional()
    @IsString()
    comment?: string;
}
