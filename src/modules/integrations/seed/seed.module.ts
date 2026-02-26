import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { DomainDocumentModule } from '../../domain/document/document.module';
import { DomainApprovalStepSnapshotModule } from '../../domain/approval-step-snapshot/approval-step-snapshot.module';
import { DomainCommentModule } from '../../domain/comment/comment.module';
import { DomainEmployeeModule } from '../../domain/employee/employee.module';

@Module({
    imports: [
        DomainDocumentModule,
        DomainApprovalStepSnapshotModule,
        DomainCommentModule,
        DomainEmployeeModule,
    ],
    controllers: [SeedController],
    providers: [SeedService],
    exports: [SeedService],
})
export class SeedModule {}
