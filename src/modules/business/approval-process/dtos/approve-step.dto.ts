import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional } from 'class-validator';

/**
 * 결재 승인 / 협의 완료 DTO (통합)
 */
export class ApproveStepDto {
    @ApiProperty({
        description: '결재 또는 협의 단계 스냅샷 ID (결재면 승인, 협의면 완료 처리)',
        example: 'uuid',
    })
    @IsUUID()
    stepSnapshotId: string;

    // @ApiProperty({
    //     description: '결재자 ID',
    //     example: 'uuid',
    // })
    // @IsUUID()
    // approverId: string;

    @ApiPropertyOptional({
        description: '결재 의견',
        example: '승인합니다.',
    })
    @IsOptional()
    @IsString()
    comment?: string;
}
