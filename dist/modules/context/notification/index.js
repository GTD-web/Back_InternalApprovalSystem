"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentNotificationService = exports.DocumentNotificationService = exports.NotificationContextModule = exports.NotificationContext = void 0;
var notification_context_1 = require("./notification.context");
Object.defineProperty(exports, "NotificationContext", { enumerable: true, get: function () { return notification_context_1.NotificationContext; } });
var notification_module_1 = require("./notification.module");
Object.defineProperty(exports, "NotificationContextModule", { enumerable: true, get: function () { return notification_module_1.NotificationContextModule; } });
var document_notification_service_1 = require("./document-notification.service");
Object.defineProperty(exports, "DocumentNotificationService", { enumerable: true, get: function () { return document_notification_service_1.DocumentNotificationService; } });
var comment_notification_service_1 = require("./comment-notification.service");
Object.defineProperty(exports, "CommentNotificationService", { enumerable: true, get: function () { return comment_notification_service_1.CommentNotificationService; } });
__exportStar(require("./dtos/notification.dto"), exports);
//# sourceMappingURL=index.js.map