import { Injectable, Logger } from '@nestjs/common';
import { MetadataSyncContext } from '../../../context/metadata-sync/metadata-sync.context';
import type { MetadataSyncAllInput } from '../../../context/metadata-sync/metadata-sync.types';
import { SyncMetadataResponseDto } from '../dtos';
import { ExternalMetadataService } from '../services/external-metadata.service';

/**
 * SyncAllMetadataUsecase
 * 외부 API에서 메타데이터를 가져와 동기화하는 비즈니스 로직
 */
@Injectable()
export class SyncAllMetadataUsecase {
    private readonly logger = new Logger(SyncAllMetadataUsecase.name);

    constructor(
        private readonly metadataSyncContext: MetadataSyncContext,
        private readonly externalMetadataService: ExternalMetadataService,
    ) {}

    /**
     * 외부 API에서 메타데이터를 가져와 동기화합니다.
     */
    async execute(): Promise<SyncMetadataResponseDto> {
        this.logger.log('메타데이터 동기화 프로세스 시작');

        try {
            // 1. 외부 API에서 메타데이터 조회
            this.logger.log('외부 API에서 메타데이터 조회 중...');
            const externalData = await this.externalMetadataService.fetchAllMetadata({
                includeTerminated: true,
                includeInactiveDepartments: true,
            });

            // 2. 컨텍스트를 통해 메타데이터 동기화 실행
            this.logger.log('메타데이터 동기화 시작...');
            const syncPayload: MetadataSyncAllInput = {
                positions: externalData.positions,
                ranks: externalData.ranks,
                departments: externalData.departments.map((d) => ({
                    ...d,
                    isCurrent: d.isActive,
                })),
                employees: externalData.employees,
                employeeDepartmentPositions: externalData.employeeDepartmentPositions,
            };
            await this.metadataSyncContext.syncAllMetadata(syncPayload);

            // 3. 성공 응답 반환
            const response: SyncMetadataResponseDto = {
                success: true,
                message: '메타데이터 동기화가 성공적으로 완료되었습니다.',
                syncedCounts: {
                    departments: externalData.departments?.length || 0,
                    employees: externalData.employees?.length || 0,
                    positions: externalData.positions?.length || 0,
                    ranks: externalData.ranks?.length || 0,
                    employeeDepartmentPositions: externalData.employeeDepartmentPositions?.length || 0,
                },
                syncedAt: new Date(),
            };

            const totalSynced =
                response.syncedCounts.departments +
                response.syncedCounts.employees +
                response.syncedCounts.positions +
                response.syncedCounts.ranks +
                response.syncedCounts.employeeDepartmentPositions;

            this.logger.log(`메타데이터 동기화 완료: 총 ${totalSynced}개 항목`);

            return response;
        } catch (error) {
            this.logger.error('메타데이터 동기화 프로세스 실패', error);
            throw error;
        }
    }
}
