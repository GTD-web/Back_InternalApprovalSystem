import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DocumentService } from '../services/document.service';
import { MultipleMailResponseDto } from '../../../integrations/notification/dtos/mail.dto';

/**
 * 문서 관리자 컨트롤러
 * - 요청에 따라 인증/권한 체크 없이 제공
 */
@ApiTags('문서 관리(관리자)')
@Controller('admin/documents')
export class DocumentAdminController {
    constructor(private readonly documentService: DocumentService) {}

    @Post(':documentId/resend-approval-line-mail')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '결재선 메일 재전송 (관리자)',
        description: '문서 기안 시 결재선(결재/협의/시행/참조 단계)에 있는 직원들에게 전송되는 안내 메일을 재전송합니다.',
    })
    @ApiParam({
        name: 'documentId',
        description: '문서 ID',
        example: '74d33939-a6b9-4602-a1fa-0a9e672a4e2b',
    })
    @ApiResponse({
        status: 200,
        description: '결재선 메일 재전송 성공',
        type: MultipleMailResponseDto,
    })
    async resendApprovalLineMail(@Param('documentId') documentId: string) {
        return await this.documentService.결재선메일을재전송한다(documentId);
    }
}

