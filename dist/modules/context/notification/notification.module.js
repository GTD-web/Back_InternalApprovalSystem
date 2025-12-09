"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationContextModule = void 0;
const common_1 = require("@nestjs/common");
const notification_context_1 = require("./notification.context");
const document_notification_service_1 = require("./document-notification.service");
const comment_notification_service_1 = require("./comment-notification.service");
const sso_module_1 = require("../../integrations/sso/sso.module");
const notification_module_1 = require("../../integrations/notification/notification.module");
const document_module_1 = require("../document/document.module");
const employee_module_1 = require("../../domain/employee/employee.module");
const approval_step_snapshot_module_1 = require("../../domain/approval-step-snapshot/approval-step-snapshot.module");
let NotificationContextModule = class NotificationContextModule {
};
exports.NotificationContextModule = NotificationContextModule;
exports.NotificationContextModule = NotificationContextModule = __decorate([
    (0, common_1.Module)({
        imports: [
            sso_module_1.SSOModule,
            notification_module_1.NotificationModule,
            (0, common_1.forwardRef)(() => document_module_1.DocumentModule),
            employee_module_1.DomainEmployeeModule,
            approval_step_snapshot_module_1.DomainApprovalStepSnapshotModule,
        ],
        providers: [notification_context_1.NotificationContext, document_notification_service_1.DocumentNotificationService, comment_notification_service_1.CommentNotificationService],
        exports: [notification_context_1.NotificationContext, document_notification_service_1.DocumentNotificationService, comment_notification_service_1.CommentNotificationService],
    })
], NotificationContextModule);
//# sourceMappingURL=notification.module.js.map