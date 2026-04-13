/**
 * 알림 서비스 관련 상수
 */

// 포털 알림 서비스 Base URL
export const NOTIFICATION_SERVICE_URL = process.env.FCM_API_URL; //  || 'https://lnms.lumir.space/api';

// 알림 전송 엔드포인트
export const NOTIFICATION_ENDPOINTS = {
    SEND: '/portal/notifications/send',
} as const;

/** 메일 API 베이스 — 알림(FCM)과 동일 서버 (NOTIFICATION_SERVICE_URL, 보통 …/api 까지) */
export const MAIL_SERVICE_URL = NOTIFICATION_SERVICE_URL;

/** NOTIFICATION_SERVICE_URL 뒤에 붙는 경로 (예: …/api + /mail/send-multiple → …/api/mail/send-multiple) */
export const MAIL_ENDPOINTS = {
    SEND_MULTIPLE: '/mail/send-multiple',
} as const;

/** 결재 알림 메일 등에서 안내하는 포털 홈(결재함) URL */
export const PORTAL_HOME_URL =
    process.env.PORTAL_HOME_URL?.trim() || 'https://portal.lumir.space/current/home';
