import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 연월별 내 결재 차례 문서 목록 조회 쿼리 DTO
 */
export class QueryMyPendingByMonthDto {
    @ApiProperty({
        description: '연도 (4자리)',
        example: 2025,
        minimum: 2000,
        maximum: 2100,
    })
    @Type(() => Number)
    @IsInt()
    @Min(2000)
    @Max(2100)
    year: number;

    @ApiProperty({
        description: '월 (1~12)',
        example: 1,
        minimum: 1,
        maximum: 12,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month: number;
}
