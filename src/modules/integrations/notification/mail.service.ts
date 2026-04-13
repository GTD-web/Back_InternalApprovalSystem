import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MultipleRecipientsMailDto, MultipleMailResponseDto } from './dtos/mail.dto';
import { MAIL_SERVICE_URL, MAIL_ENDPOINTS } from './notification.constants';

/**
 * 외부 메일 API 연동 (다중 수신자 전송 등)
 */
@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly baseUrl: string;

    constructor(private readonly httpService: HttpService) {
        this.baseUrl = MAIL_SERVICE_URL;
        this.logger.log(`메일 서비스 초기화. Base URL: ${this.baseUrl}`);
    }

    private getHeaders(authorization?: string): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (authorization) {
            headers['Authorization'] = authorization;
        }
        return headers;
    }

    /**
     * 다중 수신자 메일 전송 — POST {NOTIFICATION_SERVICE_URL}/mail/send-multiple
     */
    async sendMultiple(dto: MultipleRecipientsMailDto, authorization?: string): Promise<MultipleMailResponseDto> {
        const isLocal = process.env.NODE_ENV === 'local';
        if (isLocal) {
            return {
                success: true,
                message: '메일 미전송 (로컬 환경)',
                recipientCount: dto.recipients.length,
            };
        }

        if (!dto.recipients?.length) {
            throw new HttpException('최소 1명 이상의 수신자가 필요합니다.', HttpStatus.BAD_REQUEST);
        }

        const url = `${this.baseUrl}${MAIL_ENDPOINTS.SEND_MULTIPLE}`;

        this.logger.debug(`메일 다중 전송 요청: ${dto.recipients.length}명, 제목: ${dto.subject}`);

        try {
            const response = await firstValueFrom(
                this.httpService.post<MultipleMailResponseDto>(url, dto, {
                    headers: this.getHeaders(authorization),
                    timeout: 60000,
                }),
            );
            this.logger.log(`메일 다중 전송 응답: success=${response.data?.success}`);
            return response.data;
        } catch (error: unknown) {
            this.logger.error('메일 다중 전송 실패', error);
            const err = error as { response?: { data?: { message?: string }; status?: number } };
            if (err.response) {
                throw new HttpException(
                    err.response.data?.message || '메일 전송 중 오류가 발생했습니다.',
                    err.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
                );
            }
            throw new HttpException('메일 서버와 통신 중 오류가 발생했습니다.', HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}
