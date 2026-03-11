/**
 * 알림 서비스 관련 상수
 */

// 포털 알림 서비스 Base URL
export const NOTIFICATION_SERVICE_URL = process.env.FCM_API_URL || 'https://lnms.lumir.space/api';

// 알림 전송 엔드포인트
export const NOTIFICATION_ENDPOINTS = {
    SEND: '/portal/notifications/send',
} as const;
