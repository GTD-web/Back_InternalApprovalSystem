import { Injectable, Logger } from '@nestjs/common';
import { DocumentQueryService } from '../../../context/document/document-query.service';
import { ApprovalProcessContext } from '../../../context/approval-process/approval-process.context';

/**
 * 사용자 비즈니스 서비스
 * 로그인 사용자 기준 조회 로직을 담당합니다.
 */
@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        private readonly documentQueryService: DocumentQueryService,
        private readonly approvalProcessContext: ApprovalProcessContext,
    ) {}

    /**
     * 해당 연월에 상신되었고, 현재 내 결재 차례가 돌아온 문서 목록 조회
     */
    async getMyPendingByYearMonth(userId: string, year: number, month: number) {
        this.logger.debug(`연월별 내 결재 차례 목록: userId=${userId}, ${year}-${month}`);
        const documents = await this.documentQueryService.getMyTurnDocumentsByYearMonth(userId, year, month);
        const data = await this.approvalProcessContext.enrichDocumentsWithPendingApprovalInfo(documents, userId);
        const totalItems = data.length;
        return {
            data,
            meta: {
                currentPage: 1,
                itemsPerPage: totalItems,
                totalItems,
                totalPages: totalItems > 0 ? 1 : 0,
                hasNextPage: false,
                hasPreviousPage: false,
            },
        };
    }
}
