"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const notification_constants_1 = require("./notification.constants");
let NotificationService = NotificationService_1 = class NotificationService {
    constructor(httpService) {
        this.httpService = httpService;
        this.logger = new common_1.Logger(NotificationService_1.name);
        this.baseUrl = notification_constants_1.NOTIFICATION_SERVICE_URL;
        this.logger.log(`알림 서비스 초기화 완료. Base URL: ${this.baseUrl}`);
    }
    getHeaders(authorization) {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (authorization) {
            headers['Authorization'] = authorization;
        }
        return headers;
    }
    async sendNotification(dto, authorization) {
        const isLocal = process.env.NODE_ENV === 'local';
        if (isLocal) {
            return {
                success: true,
                message: '알림 미전송 (로컬 환경)',
                notificationIds: [],
                successCount: dto.recipients.length,
                failureCount: 0,
            };
        }
        this.validateRequest(dto);
        const url = `${this.baseUrl}${notification_constants_1.NOTIFICATION_ENDPOINTS.SEND}`;
        this.logger.debug(`알림 전송 요청: ${dto.recipients.length}명, 제목: ${dto.title}`);
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, dto, {
                headers: this.getHeaders(authorization),
                timeout: 30000,
            })).catch((error) => {
                console.log(error);
                throw error;
            });
            console.log(response.data);
            this.logger.log(`알림 전송 완료: 성공 ${response.data.successCount}건, 실패 ${response.data.failureCount}건`);
            return response.data;
        }
        catch (error) {
            this.logger.error('알림 전송 실패', error.response);
            if (error.response) {
                throw new common_1.HttpException(error.response.data?.message || '알림 전송 중 오류가 발생했습니다.', error.response.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
            throw new common_1.HttpException('알림 서버와 통신 중 오류가 발생했습니다.', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
    validateRequest(dto) {
        if (dto.recipients.length > 500) {
            throw new common_1.HttpException('한 번에 최대 500명에게 알림을 전송할 수 있습니다.', common_1.HttpStatus.BAD_REQUEST);
        }
        if (dto.recipients.length === 0) {
            throw new common_1.HttpException('최소 1명 이상의 수신자가 필요합니다.', common_1.HttpStatus.BAD_REQUEST);
        }
        dto.recipients.forEach((recipient, index) => {
            if (!recipient.tokens || recipient.tokens.length === 0) {
                throw new common_1.HttpException(`수신자 #${index + 1} (${recipient.employeeNumber})의 FCM 토큰이 없습니다.`, common_1.HttpStatus.BAD_REQUEST);
            }
        });
    }
    async sendToMultiple(sender, title, content, recipientIds, tokens, options) {
        const recipients = recipientIds.map((employeeNumber, index) => ({
            employeeNumber,
            tokens: tokens[index] ? [tokens[index]] : [],
        }));
        return this.sendNotification({
            sender,
            title,
            content,
            recipients,
            sourceSystem: options?.sourceSystem || 'portal',
            linkUrl: options?.linkUrl,
            metadata: options?.metadata,
        }, options?.authorization);
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map