import { Inject, Injectable, Logger } from '@nestjs/common';
import { ExportAllDataRequest, ExportAllDataResponse, SSOClient } from '@lumir-company/sso-sdk';
import { SSO_CLIENT } from '../../../integrations/sso/sso.constants';

/**
 * ExternalMetadataService
 * SSO SDK를 통해 조직 메타데이터(export/all)를 가져옵니다.
 */
@Injectable()
export class ExternalMetadataService {
    private readonly logger = new Logger(ExternalMetadataService.name);

    constructor(@Inject(SSO_CLIENT) private readonly ssoClient: SSOClient) {}

    /**
     * SSO Organization API에서 전체 조직 메타데이터를 가져옵니다.
     */
    async fetchAllMetadata(params?: ExportAllDataRequest): Promise<ExportAllDataResponse> {
        this.logger.log('외부 SSO SDK로 메타데이터 조회 시작');

        try {
            const data = await this.ssoClient.organization.exportAllData(params);
            console.log(data);
            this.logger.log(
                `메타데이터 조회 완료: ${data.totalCounts.departments}개 부서, ${data.totalCounts.employees}명 직원`,
            );

            return data;
        } catch (error) {
            this.logger.error('외부 SSO에서 메타데이터 조회 실패', error);
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`메타데이터 조회 실패: ${message}`);
        }
    }
}
