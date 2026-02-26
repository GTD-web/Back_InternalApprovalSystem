import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString } from 'class-validator';

/**
 * 협의 반려 DTO
 */
export class RejectAgreementDto {
    @ApiProperty({
        description: '문서 ID',
        example: 'uuid',
    })
    @IsUUID()
    documentId: string;

    @ApiProperty({
        description: '반려 사유 (필수)',
        example: '내용을 수정하여 재기안 바랍니다.',
    })
    @IsString()
    comment: string;
}
