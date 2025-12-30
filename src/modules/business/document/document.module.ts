import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentController } from './controllers/document.controller';
import { DocumentPublicController } from './controllers/document-public.controller';
import { DocumentService } from './services/document.service';
import { DocumentModule as DocumentContextModule } from '../../context/document/document.module';
import { TemplateModule as TemplateContextModule } from '../../context/template/template.module';
import { ApprovalProcessModule as ApprovalProcessContextModule } from '../../context/approval-process/approval-process.module';
import { NotificationContextModule } from '../../context/notification/notification.module';
import { CommentContextModule } from '../../context/comment/comment.module';
import { Employee } from '../../domain/employee/employee.entity';
import { Department } from '../../domain/department/department.entity';
import { EmployeeDepartmentPosition } from '../../domain/employee-department-position/employee-department-position.entity';
import { DocumentTemplate } from '../../domain/document-template/document-template.entity';
import { Document } from '../../domain/document/document.entity';
import { ApprovalStepSnapshot } from '../../domain/approval-step-snapshot/approval-step-snapshot.entity';
import { ApprovalStepTemplate } from '../../domain/approval-step-template/approval-step-template.entity';
import { Category } from '../../domain/category/category.entity';

/**
 * 문서 비즈니스 모듈
 * 문서 CRUD 및 기안 관련 API 엔드포인트를 제공합니다.
 */
@Module({
    imports: [
        DocumentContextModule,
        TemplateContextModule,
        ApprovalProcessContextModule,
        NotificationContextModule,
        CommentContextModule,
        TypeOrmModule.forFeature([
            Employee,
            Department,
            EmployeeDepartmentPosition,
            DocumentTemplate,
            Document,
            ApprovalStepSnapshot,
            ApprovalStepTemplate,
            Category,
        ]),
    ],
    controllers: [DocumentController, DocumentPublicController],
    providers: [DocumentService],
})
export class DocumentBusinessModule {}
