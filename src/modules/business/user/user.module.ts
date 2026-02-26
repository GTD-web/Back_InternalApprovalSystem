import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { DocumentModule as DocumentContextModule } from '../../context/document/document.module';
import { ApprovalProcessModule as ApprovalProcessContextModule } from '../../context/approval-process/approval-process.module';

/**
 * 사용자 비즈니스 모듈
 * 사용자(로그인 유저) 기준 조회 API를 제공합니다.
 */
@Module({
    imports: [DocumentContextModule, ApprovalProcessContextModule],
    controllers: [UserController],
    providers: [UserService],
})
export class UserBusinessModule {}
