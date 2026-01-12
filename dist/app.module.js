"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const typeorm_config_1 = require("./configs/typeorm.config");
const app_controller_1 = require("./app.controller");
const env_config_1 = require("./configs/env.config");
const auth_module_1 = require("./common/auth/auth.module");
const domain_module_1 = require("./modules/domain/domain.module");
const auth_module_2 = require("./modules/business/auth/auth.module");
const template_module_1 = require("./modules/business/template/template.module");
const metadata_module_1 = require("./modules/business/metadata/metadata.module");
const document_module_1 = require("./modules/business/document/document.module");
const approval_process_module_1 = require("./modules/business/approval-process/approval-process.module");
const sso_1 = require("./modules/integrations/sso");
const notification_1 = require("./modules/integrations/notification");
const notification_2 = require("./modules/context/notification");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [env_config_1.DB_Config, env_config_1.JWT_CONFIG],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: typeorm_config_1.typeOrmConfig,
            }),
            core_1.RouterModule.register([]),
            auth_module_1.AuthModule,
            domain_module_1.DomainModule,
            sso_1.SSOModule,
            notification_1.NotificationModule,
            notification_2.NotificationContextModule,
            auth_module_2.AuthBusinessModule,
            template_module_1.TemplateBusinessModule,
            metadata_module_1.MetadataModule,
            document_module_1.DocumentBusinessModule,
            approval_process_module_1.ApprovalProcessBusinessModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map