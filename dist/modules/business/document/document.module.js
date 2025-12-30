"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentBusinessModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const document_controller_1 = require("./controllers/document.controller");
const document_public_controller_1 = require("./controllers/document-public.controller");
const document_service_1 = require("./services/document.service");
const document_module_1 = require("../../context/document/document.module");
const template_module_1 = require("../../context/template/template.module");
const approval_process_module_1 = require("../../context/approval-process/approval-process.module");
const notification_module_1 = require("../../context/notification/notification.module");
const comment_module_1 = require("../../context/comment/comment.module");
const employee_entity_1 = require("../../domain/employee/employee.entity");
const department_entity_1 = require("../../domain/department/department.entity");
const employee_department_position_entity_1 = require("../../domain/employee-department-position/employee-department-position.entity");
const document_template_entity_1 = require("../../domain/document-template/document-template.entity");
const document_entity_1 = require("../../domain/document/document.entity");
const approval_step_snapshot_entity_1 = require("../../domain/approval-step-snapshot/approval-step-snapshot.entity");
const approval_step_template_entity_1 = require("../../domain/approval-step-template/approval-step-template.entity");
const category_entity_1 = require("../../domain/category/category.entity");
let DocumentBusinessModule = class DocumentBusinessModule {
};
exports.DocumentBusinessModule = DocumentBusinessModule;
exports.DocumentBusinessModule = DocumentBusinessModule = __decorate([
    (0, common_1.Module)({
        imports: [
            document_module_1.DocumentModule,
            template_module_1.TemplateModule,
            approval_process_module_1.ApprovalProcessModule,
            notification_module_1.NotificationContextModule,
            comment_module_1.CommentContextModule,
            typeorm_1.TypeOrmModule.forFeature([
                employee_entity_1.Employee,
                department_entity_1.Department,
                employee_department_position_entity_1.EmployeeDepartmentPosition,
                document_template_entity_1.DocumentTemplate,
                document_entity_1.Document,
                approval_step_snapshot_entity_1.ApprovalStepSnapshot,
                approval_step_template_entity_1.ApprovalStepTemplate,
                category_entity_1.Category,
            ]),
        ],
        controllers: [document_controller_1.DocumentController, document_public_controller_1.DocumentPublicController],
        providers: [document_service_1.DocumentService],
    })
], DocumentBusinessModule);
//# sourceMappingURL=document.module.js.map