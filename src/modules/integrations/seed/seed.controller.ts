import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SeedService } from './seed.service';

/**
 * 시드 요청 DTO (선택)
 * 직원은 부서명 'Web파트'인 부서의 부서원 4명을 자동 조회하여 사용합니다.
 */
export class RunSeedDto {
    @ApiPropertyOptional({ description: '문서 템플릿 ID' })
    templateId?: string;
}

@ApiTags('시드 (개발/테스트)')
@Controller('seed')
export class SeedController {
    constructor(private readonly seedService: SeedService) {}

    @Post('delete-all')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '전체 삭제 (메타데이터 제외)',
        description:
            '문서·결재단계·코멘트·문서리비전만 삭제합니다. 직원·부서·카테고리·템플릿 등 메타데이터는 유지됩니다.',
    })
    @ApiResponse({ status: 200, description: '삭제 완료', schema: { properties: { deleted: { type: 'object' } } } })
    async deleteAll() {
        return await this.seedService.deleteAllTransactionalData();
    }

    @Post('run')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '시드 데이터 생성',
        description:
            '결재 플로우·결재함 쿼리 테스트를 위한 문서/결재단계 시드를 생성합니다. ' +
            "부서명이 'Web파트'인 부서원 8명을 조회해 기안자·결재자4·시행·참조2로 사용합니다. (최소 8명 필요)",
    })
    @ApiResponse({ status: 200, description: '시드 완료', schema: { properties: { documents: { type: 'array', items: { type: 'string' } }, employeeIds: { type: 'array', items: { type: 'string' } }, message: { type: 'string' } } } })
    @ApiResponse({ status: 400, description: "Web파트 부서원이 8명 미만일 때" })
    async runSeed(@Body() dto?: RunSeedDto) {
        return await this.seedService.runSeed(dto ? { templateId: dto.templateId } : undefined);
    }
}
