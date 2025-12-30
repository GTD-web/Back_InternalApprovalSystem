import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DocumentService } from '../services/document.service';
import { DocumentResponseDto } from '../dtos';

/**
 * 문서 공개 API 컨트롤러
 * 인증 없이 접근 가능한 문서 관련 API를 제공합니다.
 */
@ApiTags('문서 관리 (Public)')
@Controller('public/documents')
export class DocumentPublicController {
    constructor(private readonly documentService: DocumentService) {}

    @Get(':documentId')
    @ApiOperation({
        summary: '문서 상세 조회 (Public)',
        description:
            '특정 문서의 상세 정보를 조회합니다.\n\n' +
            '**인증 불필요**\n\n' +
            '**주의:**\n' +
            '- 결재취소 가능 여부(`canCancelApproval`)는 항상 false로 반환됩니다.\n' +
            '- 사용자 ID가 없으므로 사용자별 권한 체크는 수행되지 않습니다.',
    })
    @ApiParam({
        name: 'documentId',
        description: '문서 ID',
    })
    @ApiResponse({
        status: 200,
        description: '문서 상세 조회 성공',
        type: DocumentResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: '문서를 찾을 수 없음',
    })
    async getDocument(@Param('documentId') documentId: string) {
        return await this.documentService.getDocument(documentId);
    }
}
