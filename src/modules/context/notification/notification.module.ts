import { Module, forwardRef } from '@nestjs/common';
import { NotificationContext } from './notification.context';
import { DocumentNotificationService } from './document-notification.service';
import { CommentNotificationService } from './comment-notification.service';
import { SSOModule } from '../../integrations/sso/sso.module';
import { NotificationModule as NotificationIntegrationModule } from '../../integrations/notification/notification.module';
import { DocumentModule } from '../document/document.module';
import { DomainEmployeeModule } from '../../domain/employee/employee.module';
import { DomainApprovalStepSnapshotModule } from '../../domain/approval-step-snapshot/approval-step-snapshot.module';

/**
 * 알림 컨텍스트 모듈
 *
 * SSO 모듈과 Notification 모듈을 통합하여
 * FCM 토큰 조회 및 알림 전송 기능을 제공합니다.
 *
 * 서비스 구성:
 * - NotificationContext: 기본 알림 전송 (sendNotification, sendNotificationToEmployee)
 * - DocumentNotificationService: 문서 상태 변경 알림 (기안/협의/결재/반려/시행)
 * - CommentNotificationService: 코멘트 알림 (작성/수정/삭제)
 */
@Module({
    imports: [
        SSOModule, // SSO 통합 모듈 (FCM 토큰 조회)
        NotificationIntegrationModule, // 알림 통합 모듈 (알림 전송)
        forwardRef(() => DocumentModule), // 문서 조회 (순환 참조 방지)
        DomainEmployeeModule, // 직원 조회
        DomainApprovalStepSnapshotModule, // 결재 단계 조회
    ],
    providers: [NotificationContext, DocumentNotificationService, CommentNotificationService],
    exports: [NotificationContext, DocumentNotificationService, CommentNotificationService],
})
export class NotificationContextModule {}
