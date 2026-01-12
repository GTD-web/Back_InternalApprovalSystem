import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { typeOrmConfig } from './configs/typeorm.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DB_Config, JWT_CONFIG } from './configs/env.config';
import { ApiDocService } from './common/documents/api-doc.service';
import { DbDocService } from './common/documents/db-doc.service';
import { AuthModule } from './common/auth/auth.module';
import { DomainModule } from './modules/domain/domain.module';

// import {
//     MetadataModule,
//     ApprovalFlowBusinessModule,
//     DocumentBusinessModule,
//     ApprovalProcessBusinessModule,
//     TestDataBusinessModule,
// } from './modules/business';

import { AuthBusinessModule } from './modules/business/auth/auth.module';
import { TemplateBusinessModule } from './modules/business/template/template.module';
import { MetadataModule } from './modules/business/metadata/metadata.module';
import { DocumentBusinessModule } from './modules/business/document/document.module';
import { ApprovalProcessBusinessModule } from './modules/business/approval-process/approval-process.module';
import { SSOModule } from './modules/integrations/sso';
import { NotificationModule } from './modules/integrations/notification';
import { NotificationContextModule } from './modules/context/notification';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [DB_Config, JWT_CONFIG],
        }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: typeOrmConfig,
        }),
        RouterModule.register([
            // {
            //     path: 'document',
            //     module: DocumentModule,
            // },
            // {
            //     path: 'metadata',
            //     module: MetadataModule,
            // },
            // {
            //     path: 'approval-flow',
            //     module: ApprovalFlowBusinessModule,
            // },
            // {
            //     path: 'document',
            //     module: DocumentBusinessModule,
            // },
            // {
            //     path: 'approval-process',
            //     module: ApprovalProcessBusinessModule,
            // },
            // {
            //     path: 'test-data',
            //     module: TestDataBusinessModule,
            // },
            // {
            //     path: 'approval',
            //     module: ApprovalModule,
            // },
        ]),
        AuthModule,
        DomainModule, // 글로벌 도메인 모듈 (모든 도메인 서비스를 전역으로 제공)
        SSOModule, // SSO 통합 모듈
        NotificationModule, // 알림 서비스 통합 모듈
        NotificationContextModule, // 알림 컨텍스트 모듈 (FCM 토큰 조회 + 알림 전송)
        AuthBusinessModule, // 인증 비즈니스 모듈
        TemplateBusinessModule,
        MetadataModule,
        DocumentBusinessModule,
        ApprovalProcessBusinessModule,
        // ApprovalFlowBusinessModule,
        // DocumentBusinessModule,
        // ApprovalProcessBusinessModule,
        // TestDataBusinessModule,
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}
