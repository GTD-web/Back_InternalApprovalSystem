import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { SyncAllMetadataUsecase } from './usecases/sync-all-metadata.usecase';

const 메타데이터동기화Cron작업이름 = 'metadataSync';

/**
 * 기본: 매시 정각(0 * * * *). METADATA_SYNC_CRON이 있으면 해당 표현식으로 덮어씁니다.
 * 표현식은 node-cron 형식(분 시 일 월 요일)입니다.
 */
@Injectable()
export class MetadataSyncScheduler implements OnModuleInit {
    private readonly logger = new Logger(MetadataSyncScheduler.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly syncAllMetadataUsecase: SyncAllMetadataUsecase,
    ) {}

    onModuleInit(): void {
        const expression =
            this.configService.get<string>('METADATA_SYNC_CRON')?.trim() || '0 * * * *';

        const timeZone =
            this.configService.get<string>('METADATA_SYNC_CRON_TIMEZONE')?.trim() || 'Asia/Seoul';

        if (this.schedulerRegistry.doesExist('cron', 메타데이터동기화Cron작업이름)) {
            this.schedulerRegistry.deleteCronJob(메타데이터동기화Cron작업이름);
        }

        const job = CronJob.from({
            cronTime: expression,
            onTick: () => {
                void this.동기화실행한다();
            },
            timeZone,
            start: true,
        });

        this.schedulerRegistry.addCronJob(메타데이터동기화Cron작업이름, job);
        this.logger.log(`메타데이터 cron 등록: "${expression}" (${timeZone})`);
    }

    private async 동기화실행한다(): Promise<void> {
        this.logger.log('메타데이터 cron 동기화 시작');
        try {
            await this.syncAllMetadataUsecase.execute();
            this.logger.log('메타데이터 cron 동기화 성공');
        } catch (error) {
            this.logger.error('메타데이터 cron 동기화 실패', error);
        }
    }
}
