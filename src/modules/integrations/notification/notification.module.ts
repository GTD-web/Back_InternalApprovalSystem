import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationService } from './notification.service';
import { MailService } from './mail.service';

@Module({
    imports: [
        HttpModule.register({
            timeout: 30000, // 30초 타임아웃
            maxRedirects: 5,
        }),
    ],
    providers: [NotificationService, MailService],
    exports: [NotificationService, MailService],
})
export class NotificationModule {}
