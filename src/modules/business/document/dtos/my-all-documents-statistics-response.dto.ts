import { ApiProperty } from '@nestjs/swagger';

/**
 * 결재함별 문서 통계 응답 DTO (사이드바용)
 *
 * - DRAFT: 임시저장함
 * - RECEIVED: 수신함
 * - PENDING: 상신함 (나의 상신한 모든 문서)
 * - PENDING_MINE: 미결함 (지금 내가 결재·협의해야 하는 문서)
 * - IMPLEMENTATION: 시행함
 * - APPROVED: 기결함 (기안한 문서 중 결재·시행 완료 + 내가 승인한 문서)
 * - REJECTED: 반려함 (내가 합의·결재자로 있는 문서 중 반려된 문서)
 * - RECEIVED_REFERENCE: 수신참조함 (문서 상태 무관)
 */
export class MyAllDocumentsStatisticsResponseDto {
    @ApiProperty({ description: '임시저장함 (나의 상신 전 문서)', example: 1 })
    DRAFT: number;

    @ApiProperty({ description: '수신함 (내가 수신처로 지정된 문서)', example: 10 })
    RECEIVED: number;

    @ApiProperty({ description: '상신함 (나의 상신한 모든 문서, DRAFT 제외)', example: 10 })
    PENDING: number;

    @ApiProperty({
        description: '미결함 (지금 내가 결재·협의해야 하는 문서)',
        example: 3,
    })
    PENDING_MINE: number;

    @ApiProperty({
        description: '시행함 (지금 내가 시행해야 하는 문서)',
        example: 1,
    })
    IMPLEMENTATION: number;

    @ApiProperty({
        description: '기결함 (기안한 문서 중 결재·시행 완료 + 내가 합의·결재에 승인한 문서)',
        example: 20,
    })
    APPROVED: number;

    @ApiProperty({
        description: '반려함 (내가 합의·결재자로 있는 문서 중 반려된 문서)',
        example: 3,
    })
    REJECTED: number;

    @ApiProperty({
        description: '수신참조함 (내가 수신참조자로 지정된 문서, 문서 상태 무관)',
        example: 23,
    })
    RECEIVED_REFERENCE: number;
}
