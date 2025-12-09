import { SSOService } from '../../integrations/sso/sso.service';
import { NotificationService } from '../../integrations/notification/notification.service';
import { SendNotificationDto, SendNotificationResponseDto, SendNotificationToEmployeeDto } from './dtos/notification.dto';
export declare class NotificationContext {
    private readonly ssoService;
    private readonly notificationService;
    private readonly logger;
    constructor(ssoService: SSOService, notificationService: NotificationService);
    sendNotification(dto: SendNotificationDto): Promise<SendNotificationResponseDto>;
    sendNotificationToEmployee(dto: SendNotificationToEmployeeDto): Promise<SendNotificationResponseDto>;
    private validateSendNotificationDto;
    private validateSendNotificationToEmployeeDto;
    getSenderName(employee: {
        name?: string;
        employeeNumber?: string;
    }): string;
    getAuthorizationHeader(accessToken: string): string;
}
