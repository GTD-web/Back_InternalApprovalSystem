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
var NotificationContext_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationContext = void 0;
const common_1 = require("@nestjs/common");
const sso_service_1 = require("../../integrations/sso/sso.service");
const notification_service_1 = require("../../integrations/notification/notification.service");
let NotificationContext = NotificationContext_1 = class NotificationContext {
    constructor(ssoService, notificationService) {
        this.ssoService = ssoService;
        this.notificationService = notificationService;
        this.logger = new common_1.Logger(NotificationContext_1.name);
    }
    async sendNotification(dto) {
        this.logger.log(`알림 전송 시작: ${dto.recipientEmployeeIds.length}명, 제목: ${dto.title}`);
        this.validateSendNotificationDto(dto);
        try {
            const fcmResponse = await this.ssoService.getMultipleFcmTokens({
                employeeIds: dto.recipientEmployeeIds,
            });
            this.logger.debug(`FCM 토큰 조회 완료: ${fcmResponse.totalTokens || 0}개`);
            if (!fcmResponse.allTokens || fcmResponse.allTokens.length === 0) {
                this.logger.warn('알림을 받을 수 있는 FCM 토큰이 없습니다.');
                return {
                    success: false,
                    message: '알림을 받을 수 있는 FCM 토큰이 없습니다.',
                    notificationIds: [],
                    successCount: 0,
                    failureCount: dto.recipientEmployeeIds.length,
                };
            }
            const { byEmployee } = fcmResponse;
            const recipients = byEmployee
                .map((employee) => {
                const prodTokens = employee.tokens
                    .filter((token) => token.deviceType.includes('portal'))
                    .map((token) => token.fcmToken);
                if (prodTokens.length > 0) {
                    return {
                        employeeNumber: employee.employeeNumber,
                        tokens: prodTokens,
                    };
                }
                return null;
            })
                .filter((recipient) => recipient !== null);
            const notificationDto = {
                sender: dto.sender,
                title: dto.title,
                content: dto.content,
                recipients: recipients,
                sourceSystem: 'LIAS',
                linkUrl: dto.linkUrl,
                metadata: dto.metadata,
            };
            const result = await this.notificationService.sendNotification(notificationDto, dto.authorization);
            this.logger.log(`알림 전송 완료: 성공 ${result.successCount}건, 실패 ${result.failureCount}건`);
            return result;
        }
        catch (error) {
            this.logger.error('알림 전송 실패', error);
            throw error;
        }
    }
    async sendNotificationToEmployee(dto) {
        this.logger.log(`단일 알림 전송 시작: ${dto.recipientEmployeeId}, 제목: ${dto.title}`);
        this.validateSendNotificationToEmployeeDto(dto);
        try {
            const fcmResponse = await this.ssoService.getFcmToken({
                employeeId: dto.recipientEmployeeId,
            });
            this.logger.debug(`FCM 토큰 조회 완료: ${fcmResponse.tokens?.length || 0}개`);
            if (!fcmResponse.tokens || fcmResponse.tokens.length === 0) {
                this.logger.warn(`FCM 토큰이 등록되지 않음: ${dto.recipientEmployeeId}`);
                return {
                    success: false,
                    message: 'FCM 토큰이 등록되지 않음',
                    notificationIds: [],
                    successCount: 0,
                    failureCount: 1,
                };
            }
            const employeeTokens = fcmResponse;
            const prodTokens = employeeTokens.tokens
                .filter((token) => token.deviceType === 'prod')
                .map((token) => token.fcmToken);
            const notificationDto = {
                sender: dto.sender,
                title: dto.title,
                content: dto.content,
                recipients: [
                    {
                        employeeNumber: employeeTokens.employeeNumber,
                        tokens: prodTokens,
                    },
                ],
                sourceSystem: 'LIAS',
                linkUrl: dto.linkUrl,
                metadata: dto.metadata,
            };
            const result = await this.notificationService.sendNotification(notificationDto, dto.authorization);
            this.logger.log(`단일 알림 전송 완료: ${result.successCount > 0 ? '성공' : '실패'}`);
            return result;
        }
        catch (error) {
            this.logger.error('단일 알림 전송 실패', error);
            throw error;
        }
    }
    validateSendNotificationDto(dto) {
        if (!dto.sender || dto.sender.trim().length === 0) {
            throw new common_1.BadRequestException('발신자(sender)는 필수입니다.');
        }
        if (!dto.title || dto.title.trim().length === 0) {
            throw new common_1.BadRequestException('제목(title)은 필수입니다.');
        }
        if (!dto.content || dto.content.trim().length === 0) {
            throw new common_1.BadRequestException('본문(content)은 필수입니다.');
        }
        if (!dto.recipientEmployeeIds || dto.recipientEmployeeIds.length === 0) {
            throw new common_1.BadRequestException('수신자(recipientEmployeeIds)는 최소 1명 이상이어야 합니다.');
        }
        const uniqueRecipients = [...new Set(dto.recipientEmployeeIds)];
        if (uniqueRecipients.length !== dto.recipientEmployeeIds.length) {
            this.logger.warn('중복된 수신자가 있어 제거되었습니다.');
            dto.recipientEmployeeIds = uniqueRecipients;
        }
    }
    validateSendNotificationToEmployeeDto(dto) {
        if (!dto.sender || dto.sender.trim().length === 0) {
            throw new common_1.BadRequestException('발신자(sender)는 필수입니다.');
        }
        if (!dto.title || dto.title.trim().length === 0) {
            throw new common_1.BadRequestException('제목(title)은 필수입니다.');
        }
        if (!dto.content || dto.content.trim().length === 0) {
            throw new common_1.BadRequestException('본문(content)은 필수입니다.');
        }
        if (!dto.recipientEmployeeId || dto.recipientEmployeeId.trim().length === 0) {
            throw new common_1.BadRequestException('수신자(recipientEmployeeId)는 필수입니다.');
        }
    }
    getSenderName(employee) {
        return employee.name || employee.employeeNumber || '시스템';
    }
    getAuthorizationHeader(accessToken) {
        if (accessToken.startsWith('Bearer ')) {
            return accessToken;
        }
        return `Bearer ${accessToken}`;
    }
};
exports.NotificationContext = NotificationContext;
exports.NotificationContext = NotificationContext = NotificationContext_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sso_service_1.SSOService,
        notification_service_1.NotificationService])
], NotificationContext);
//# sourceMappingURL=notification.context.js.map