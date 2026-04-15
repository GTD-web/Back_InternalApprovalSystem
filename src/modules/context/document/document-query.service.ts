import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Document } from '../../domain/document/document.entity';
import { DomainDocumentService } from '../../domain/document/document.service';
import { DomainDocumentTemplateService } from '../../domain/document-template/document-template.service';
import { DocumentFilterDto } from './dtos/document.dto';
import { DocumentStatus, ApprovalStatus, ApprovalStepType } from '../../../common/enums/approval.enum';
import { DocumentFilterBuilder } from './document-filter.builder';

/**
 * 문서 조회 서비스
 *
 * 역할:
 * - 문서 조회 (단건, 목록, 통계)
 * - 복잡한 필터링 및 검색
 * - 페이징 처리
 */
@Injectable()
export class DocumentQueryService {
    private readonly logger = new Logger(DocumentQueryService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly documentService: DomainDocumentService,
        private readonly documentTemplateService: DomainDocumentTemplateService,
        private readonly filterBuilder: DocumentFilterBuilder,
    ) {}

    // ============================================
    // 📖 기본 조회
    // ============================================

    /**
     * 문서 조회 (단건)
     * @param documentId 문서 ID
     * @param queryRunner 쿼리 러너 (선택적)
     */
    async getDocument(documentId: string, queryRunner?: QueryRunner) {
        const document = await this.documentService.findOne({
            where: { id: documentId },
            relations: [
                'drafter',
                'drafter.departmentPositions',
                'drafter.departmentPositions.department',
                'drafter.departmentPositions.position',
                'approvalSteps',
            ],
            order: {
                approvalSteps: {
                    stepOrder: 'ASC',
                },
            },
            queryRunner,
        });

        if (!document) {
            throw new NotFoundException(`문서를 찾을 수 없습니다: ${documentId}`);
        }

        // 템플릿 및 카테고리 정보 직접 조회
        let documentTemplate = null;
        if (document.documentTemplateId) {
            documentTemplate = await this.documentTemplateService.findOne({
                where: { id: document.documentTemplateId },
                relations: ['category'],
            });
        }

        // 기안자의 부서/포지션 정보 추출
        const drafterWithDeptPos = this.extractDrafterDepartmentPosition(document.drafter);

        return {
            ...document,
            drafter: drafterWithDeptPos,
            documentTemplate,
        };
    }

    /**
     * 결재취소 가능 여부 계산 (문서 레벨)
     *
     * 결재취소 조건:
     * 1. 문서 상태가 PENDING (결재 진행중)
     * 2. 현재 사용자가 이미 승인(APPROVED) 상태
     * 3. 다음 단계 수신자가 아직 어떤 행동도 하지 않은 상태 (PENDING)
     *
     * @returns 현재 사용자가 결재취소 가능한지 여부
     */
    private calculateCanCancelApproval(
        approvalSteps: Array<{
            id: string;
            approverId: string;
            status: ApprovalStatus;
            stepOrder: number;
            stepType: ApprovalStepType;
        }>,
        documentStatus: DocumentStatus,
        userId: string,
    ): boolean {
        // 조건 1: 문서 상태가 PENDING (결재 진행중)이 아니면 취소 불가
        if (documentStatus !== DocumentStatus.PENDING) {
            return false;
        }

        // stepOrder 순으로 정렬
        const sortedSteps = [...approvalSteps].sort((a, b) => a.stepOrder - b.stepOrder);

        // 현재 사용자의 승인된 스텝 찾기
        for (let i = 0; i < sortedSteps.length; i++) {
            const step = sortedSteps[i];

            // 조건 2: 현재 사용자가 이미 승인(APPROVED) 상태인 스텝 찾기
            if (step.approverId === userId && step.status === ApprovalStatus.APPROVED) {
                // 조건 3: 다음 단계 수신자가 아직 PENDING 상태인지 확인
                const nextStep = sortedSteps[i + 1];

                if (nextStep && nextStep.status === ApprovalStatus.PENDING) {
                    // 다음 단계가 아직 PENDING 상태 → 취소 가능
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 상신취소 가능 여부 계산 (문서 레벨)
     *
     * 상신취소 조건:
     * 1. 문서 상태가 PENDING (결재 진행중)
     * 2. 현재 사용자가 기안자
     * 3. 결재자가 아직 어떤 처리도 하지 않은 상태 (모든 결재 단계가 PENDING)
     *
     * @returns 현재 사용자가 상신취소 가능한지 여부
     */
    private calculateCanCancelSubmit(
        approvalSteps: Array<{
            id: string;
            approverId: string;
            status: ApprovalStatus;
            stepOrder: number;
            stepType: ApprovalStepType;
        }>,
        documentStatus: DocumentStatus,
        drafterId: string,
        userId: string,
    ): boolean {
        // 조건 1: 문서 상태가 PENDING (결재 진행중)이 아니면 취소 불가
        if (documentStatus !== DocumentStatus.PENDING) {
            return false;
        }

        // 조건 2: 현재 사용자가 기안자가 아니면 취소 불가
        if (drafterId !== userId) {
            return false;
        }

        // 조건 3: 결재자가 아직 어떤 처리도 하지 않은 상태인지 확인
        // (모든 결재 단계가 PENDING 상태여야 함)
        const hasAnyProcessed = approvalSteps.some(
            (step) => step.status === ApprovalStatus.APPROVED || step.status === ApprovalStatus.REJECTED,
        );

        return !hasAnyProcessed;
    }

    /**
     * 문서 목록 조회 (필터링)
     *
     * 조회 모드:
     * 1. 내가 기안한 문서 (drafterId 지정)
     * 2. 내가 참조자로 있는 문서 (referenceUserId 지정)
     *
     * 두 모드는 상호 배타적이며, referenceUserId가 우선됩니다.
     */
    async getDocuments(filter: DocumentFilterDto, queryRunner?: QueryRunner) {
        const qb = queryRunner
            ? queryRunner.manager.getRepository(Document).createQueryBuilder('document')
            : this.documentService.createQueryBuilder('document');

        qb.leftJoinAndSelect('document.drafter', 'drafter')
            .leftJoinAndSelect('document.approvalSteps', 'approvalSteps')
            .orderBy('document.createdAt', 'DESC')
            .addOrderBy('approvalSteps.stepOrder', 'ASC');

        // 조회 모드 결정: 참조자 모드 vs 기안자 모드
        if (filter.referenceUserId) {
            // === 모드 1: 내가 참조자로 있는 문서 ===
            // 기안자 상관없음, 임시저장 제외 (기안된 문서만)
            // 단계 타입이 REFERENCE이고 approverId가 나인 문서
            qb.andWhere(
                `document.id IN (
                    SELECT DISTINCT d.id
                    FROM documents d
                    INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
                    WHERE ass."stepType" = :referenceStepType
                    AND ass."approverId" = :referenceUserId
                    AND d.status != :draftStatus
                )`,
                {
                    referenceStepType: ApprovalStepType.REFERENCE,
                    referenceUserId: filter.referenceUserId,
                    draftStatus: DocumentStatus.DRAFT,
                },
            );
        } else if (filter.drafterId) {
            // === 모드 2: 내가 기안한 문서 ===
            qb.andWhere('document.drafterId = :drafterId', { drafterId: filter.drafterId });

            // 1. 기본 필터
            if (filter.status) {
                qb.andWhere('document.status = :status', { status: filter.status });
            }

            // 2. PENDING 상태의 문서 중 현재 단계 타입별 필터링
            // 현재 진행 중인 단계(가장 작은 stepOrder의 PENDING 단계)의 타입으로 필터링
            if (filter.status === DocumentStatus.PENDING && filter.pendingStepType) {
                qb.andWhere(
                    `document.id IN (
                        SELECT document_id
                        FROM (
                            SELECT DISTINCT ON (d.id)
                                d.id as document_id,
                                ass."stepType"
                            FROM documents d
                            INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
                            WHERE d.status = :pendingStatus
                            AND ass.status = :pendingStepStatus
                            AND d."drafterId" = :drafterId
                            ORDER BY d.id, ass."stepOrder" ASC
                        ) current_steps
                        WHERE "stepType" = :stepType
                    )`,
                    {
                        pendingStatus: DocumentStatus.PENDING,
                        pendingStepStatus: ApprovalStatus.PENDING,
                        stepType: filter.pendingStepType,
                    },
                );
            }
        }

        // 공통 필터 (모든 모드에 적용)
        if (filter.documentTemplateId) {
            qb.andWhere('document.documentTemplateId = :documentTemplateId', {
                documentTemplateId: filter.documentTemplateId,
            });
        }

        // 3. 카테고리 필터 (문서 템플릿을 통해 조인)
        if (filter.categoryId) {
            qb.leftJoin('document_templates', 'template', 'document.documentTemplateId = template.id');
            qb.andWhere('template.categoryId = :categoryId', { categoryId: filter.categoryId });
        }

        // 4. 검색어 (제목)
        if (filter.searchKeyword) {
            qb.andWhere('document.title LIKE :keyword', { keyword: `%${filter.searchKeyword}%` });
        }

        // 5. 날짜 범위
        if (filter.startDate) {
            qb.andWhere('document.createdAt >= :startDate', { startDate: filter.startDate });
        }

        if (filter.endDate) {
            qb.andWhere('document.createdAt <= :endDate', { endDate: filter.endDate });
        }

        // 6. 페이징 처리
        const page = filter.page || 1;
        const limit = filter.limit || 20;
        const skip = (page - 1) * limit;

        // 전체 개수 조회
        const totalItems = await qb.getCount();

        // 데이터 조회
        const documents = await qb.skip(skip).take(limit).getMany();

        // 페이징 메타데이터 계산
        const totalPages = Math.ceil(totalItems / limit);

        return {
            data: documents,
            meta: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }

    /**
     * 내 전체 문서 목록 조회 (작성 + 결재라인)
     * 통계와 동일한 필터 타입으로 문서 목록 조회
     * - getMyAllDocumentsStatistics와 동일한 조건을 사용하여 데이터 정합성 보장
     */
    async getMyAllDocuments(params: {
        userId: string;
        filterType?: string;
        receivedStepType?: string;
        drafterFilter?: string;
        referenceReadStatus?: string;
        pendingStatusFilter?: string;
        searchKeyword?: string;
        startDate?: Date;
        endDate?: Date;
        sortOrder?: string;
        page?: number;
        limit?: number;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;
        const sortOrder = params.sortOrder || 'LATEST';

        // 조인 없이 필터 조건만 적용한 쿼리빌더 생성 (ID 조회 및 카운트용)
        const baseQb = this.documentService.createQueryBuilder('document');

        // 정렬 순서 적용
        if (sortOrder === 'OLDEST') {
            baseQb.orderBy('document.createdAt', 'ASC');
        } else {
            baseQb.orderBy('document.createdAt', 'DESC');
        }

        // 필터 타입별 조건 적용 (FilterBuilder 사용)
        this.filterBuilder.applyFilter(baseQb, params.filterType || 'ALL', params.userId, {
            receivedStepType: params.receivedStepType,
            drafterFilter: params.drafterFilter,
            referenceReadStatus: params.referenceReadStatus,
            pendingStatusFilter: params.pendingStatusFilter,
        });

        // 추가 필터링 조건 (연월 등)
        if (params.searchKeyword) {
            // 문서 제목 또는 템플릿 이름으로 검색
            baseQb.leftJoin('document_templates', 'template', 'document.documentTemplateId = template.id');
            baseQb.andWhere('(document.title LIKE :keyword OR template.name LIKE :keyword)', {
                keyword: `%${params.searchKeyword}%`,
            });
        }

        if (params.startDate) {
            baseQb.andWhere('document.submittedAt >= :startDate', { startDate: params.startDate });
        }

        if (params.endDate) {
            baseQb.andWhere('document.submittedAt <= :endDate', { endDate: params.endDate });
        }

        // 1단계: 전체 개수 조회
        const totalItems = await baseQb.getCount();

        // 2단계: 페이지네이션 적용하여 document ID만 조회 (중복 없이)
        const documentIds = await baseQb.clone().select('document.id').skip(skip).take(limit).getRawMany();

        this.logger.debug(
            `페이지네이션 적용: skip=${skip}, limit=${limit}, 조회된 ID 개수=${documentIds.length}, 전체=${totalItems}`,
        );

        // 3단계: ID 기준으로 전체 데이터 조회 (approvalSteps 포함)
        let documents = [];
        if (documentIds.length > 0) {
            const ids = documentIds.map((item) => item.document_id);

            const documentsMap = await this.documentService
                .createQueryBuilder('document')
                .leftJoinAndSelect('document.drafter', 'drafter')
                .leftJoinAndSelect('document.approvalSteps', 'approvalSteps')
                .whereInIds(ids)
                .addOrderBy('approvalSteps.stepOrder', 'ASC')
                .getMany();

            // DocumentTemplate과 Category 정보를 별도로 조회
            const templateIds = [...new Set(documentsMap.map((doc) => doc.documentTemplateId).filter(Boolean))];
            let templatesWithCategory = [];

            if (templateIds.length > 0) {
                const templateResults = await this.dataSource
                    .createQueryBuilder()
                    .select([
                        'dt.id as template_id',
                        'dt.name as template_name',
                        'dt.code as template_code',
                        'c.id as category_id',
                        'c.name as category_name',
                        'c.code as category_code',
                        'c.description as category_description',
                        'c.order as category_order',
                    ])
                    .from('document_templates', 'dt')
                    .leftJoin('categories', 'c', 'dt.categoryId = c.id')
                    .where('dt.id IN (:...templateIds)', { templateIds })
                    .getRawMany();

                templatesWithCategory = templateResults.map((row) => ({
                    id: row.template_id,
                    name: row.template_name,
                    code: row.template_code,
                    category: row.category_id
                        ? {
                              id: row.category_id,
                              name: row.category_name,
                              code: row.category_code,
                              description: row.category_description,
                              order: row.category_order,
                          }
                        : undefined,
                }));
            }

            // Template 정보를 Document에 매핑 및 결재취소/상신취소 가능 여부 계산
            const templateMap = new Map(templatesWithCategory.map((t) => [t.id, t]));
            const documentsWithTemplate = documentsMap.map((doc) => {
                // 결재취소 가능 여부 계산 (문서 레벨)
                const canCancelApproval =
                    doc.approvalSteps && doc.approvalSteps.length > 0
                        ? this.calculateCanCancelApproval(doc.approvalSteps, doc.status, params.userId)
                        : false;

                // 상신취소 가능 여부 계산 (문서 레벨)
                const canCancelSubmit = this.calculateCanCancelSubmit(
                    doc.approvalSteps || [],
                    doc.status,
                    doc.drafterId,
                    params.userId,
                );

                return {
                    ...doc,
                    documentTemplate: doc.documentTemplateId ? templateMap.get(doc.documentTemplateId) : undefined,
                    canCancelApproval,
                    canCancelSubmit,
                };
            });

            // ID 순서대로 정렬 (페이지네이션 순서 유지)
            const docMap = new Map(documentsWithTemplate.map((doc) => [doc.id, doc]));
            documents = ids.map((id) => docMap.get(id)).filter((doc) => doc !== undefined);
        }

        // 페이징 메타데이터 계산
        const totalPages = Math.ceil(totalItems / limit);

        return {
            data: documents,
            meta: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }

    /**
     * 현재 내 결재 차례가 돌아온 문서(미결함) 중, 문서 상신일(submittedAt)이 해당 연월 범위에 포함되는 목록 조회
     */
    async getMyTurnDocumentsByYearMonth(userId: string, year: number, month: number): Promise<Document[]> {
        const qb = this.documentService
            .createQueryBuilder('document')
            .leftJoinAndSelect('document.drafter', 'drafter')
            .where('1=1');

        this.filterBuilder.applyFilter(qb, 'PENDING', userId);

        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);

        qb.andWhere('document.submittedAt IS NOT NULL')
            .andWhere('document.submittedAt >= :start', { start })
            .andWhere('document.submittedAt < :end', { end });

        qb.orderBy('document.submittedAt', 'DESC');

        return qb.getMany();
    }

    /**
     * 내가 작성한 문서 전체 조회
     * @param drafterId 기안자 ID
     * @param page 페이지 번호
     * @param limit 페이지당 항목 수
     * @param draftFilter DRAFT 상태 필터 (DRAFT_ONLY: 임시저장만, EXCLUDE_DRAFT: 임시저장 제외)
     */
    async getMyDrafts(
        drafterId: string,
        page: number = 1,
        limit: number = 20,
        draftFilter?: 'DRAFT_ONLY' | 'EXCLUDE_DRAFT',
    ) {
        const skip = (page - 1) * limit;

        const qb = this.documentService
            .createQueryBuilder('document')
            .leftJoinAndSelect('document.drafter', 'drafter')
            .leftJoinAndSelect('drafter.departmentPositions', 'drafterDepartmentPositions')
            .leftJoinAndSelect('drafterDepartmentPositions.department', 'drafterDepartment')
            .leftJoinAndSelect('drafterDepartmentPositions.position', 'drafterPosition')
            .leftJoinAndSelect('drafter.currentRank', 'drafterRank')
            .leftJoinAndSelect('document.approvalSteps', 'approvalSteps')
            .where('document.drafterId = :drafterId', { drafterId })
            .orderBy('document.createdAt', 'DESC')
            .addOrderBy('approvalSteps.stepOrder', 'ASC');

        // DRAFT 상태 필터링
        if (draftFilter === 'DRAFT_ONLY') {
            qb.andWhere('document.status = :draftStatus', { draftStatus: DocumentStatus.DRAFT });
        } else if (draftFilter === 'EXCLUDE_DRAFT') {
            qb.andWhere('document.status != :draftStatus', { draftStatus: DocumentStatus.DRAFT });
        }

        // 전체 개수 조회
        const totalItems = await qb.getCount();

        // 데이터 조회
        const documents = await qb.skip(skip).take(limit).getMany();

        // 기안자 정보 평탄화 (department, position, rank를 drafter 바로 아래로 이동)
        const mappedDocuments = documents.map((doc) => {
            if (doc.drafter && doc.drafter.departmentPositions && doc.drafter.departmentPositions.length > 0) {
                const currentDepartmentPosition =
                    doc.drafter.departmentPositions.find((dp) => dp.isManager) || doc.drafter.departmentPositions[0];

                return {
                    ...doc,
                    drafter: {
                        id: doc.drafter.id,
                        employeeNumber: doc.drafter.employeeNumber,
                        name: doc.drafter.name,
                        email: doc.drafter.email,
                        department: currentDepartmentPosition.department
                            ? {
                                  id: currentDepartmentPosition.department.id,
                                  departmentName: currentDepartmentPosition.department.departmentName,
                                  departmentCode: currentDepartmentPosition.department.departmentCode,
                              }
                            : undefined,
                        position: currentDepartmentPosition.position
                            ? {
                                  id: currentDepartmentPosition.position.id,
                                  positionTitle: currentDepartmentPosition.position.positionTitle,
                                  positionCode: currentDepartmentPosition.position.positionCode,
                                  level: currentDepartmentPosition.position.level,
                              }
                            : undefined,
                        rank: doc.drafter.currentRank
                            ? {
                                  id: doc.drafter.currentRank.id,
                                  rankTitle: doc.drafter.currentRank.rankTitle,
                                  rankCode: doc.drafter.currentRank.rankCode,
                              }
                            : undefined,
                    },
                };
            }
            return doc;
        });

        // 페이징 메타데이터 계산
        const totalPages = Math.ceil(totalItems / limit);

        return {
            data: mappedDocuments,
            meta: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }

    // ============================================
    // 📊 통계 조회
    // ============================================

    /**
     * 문서 통계 조회
     * 내가 기안한 문서와 참조 문서의 상태별 통계를 반환합니다.
     */
    async getDocumentStatistics(userId: string) {
        this.logger.debug(`문서 통계 조회: 사용자 ${userId}`);

        // 1. 내가 기안한 문서 통계
        const myDocumentsStats = await this.dataSource.query(
            `
            SELECT
                COUNT(*) FILTER (WHERE status = $1) as draft,
                COUNT(*) FILTER (WHERE "submittedAt" IS NOT NULL) as submitted,
                COUNT(*) FILTER (WHERE status = $2) as "pending",
                COUNT(*) FILTER (WHERE status = $3) as approved,
                COUNT(*) FILTER (WHERE status = $4) as rejected,
                COUNT(*) FILTER (WHERE status = $5) as implemented
            FROM documents
            WHERE "drafterId" = $6
            `,
            [
                DocumentStatus.DRAFT,
                DocumentStatus.PENDING,
                DocumentStatus.APPROVED,
                DocumentStatus.REJECTED,
                DocumentStatus.IMPLEMENTED,
                userId,
            ],
        );

        // 2. PENDING 상태의 문서 중 현재 단계 타입별 통계
        // 현재 진행 중인 단계(가장 작은 stepOrder의 PENDING 단계)의 타입으로 분류
        const pendingStepStats = await this.dataSource.query(
            `
            WITH current_steps AS (
                SELECT DISTINCT ON (d.id)
                    d.id as document_id,
                    ass."stepType"
                FROM documents d
                INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
                WHERE d."drafterId" = $1
                AND d.status = $2
                AND ass.status = $3
                ORDER BY d.id, ass."stepOrder" ASC
            )
            SELECT
                COUNT(*) FILTER (WHERE "stepType" = $4) as agreement,
                COUNT(*) FILTER (WHERE "stepType" = $5) as approval
            FROM current_steps
            `,
            [
                userId,
                DocumentStatus.PENDING,
                ApprovalStatus.PENDING,
                ApprovalStepType.AGREEMENT,
                ApprovalStepType.APPROVAL,
            ],
        );

        // 3. 내가 참조자로 있는 문서 통계
        // 기안자 상관없음, 임시저장 제외 (기안된 문서만)
        // 단계 타입이 REFERENCE이고 approverId가 나인 문서
        const referenceStats = await this.dataSource.query(
            `
            SELECT COUNT(DISTINCT d.id) as reference
            FROM documents d
            INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
            WHERE ass."stepType" = $1
            AND ass."approverId" = $2
            AND d.status != $3
            `,
            [ApprovalStepType.REFERENCE, userId, DocumentStatus.DRAFT],
        );

        const myStats = myDocumentsStats[0];
        const pendingStats = pendingStepStats[0];
        const refStats = referenceStats[0];

        return {
            myDocuments: {
                draft: parseInt(myStats.draft || '0'),
                submitted: parseInt(myStats.submitted || '0'),
                agreement: parseInt(pendingStats.agreement || '0'),
                approval: parseInt(pendingStats.approval || '0'),
                approved: parseInt(myStats.approved || '0'),
                rejected: parseInt(myStats.rejected || '0'),
                implemented: parseInt(myStats.implemented || '0'),
            },
            othersDocuments: {
                reference: parseInt(refStats.reference || '0'),
            },
        };
    }

    /**
     * 내 전체 문서 통계 조회 (작성 + 결재라인)
     * 사이드바 표시용 통계
     * - getMyAllDocuments와 동일한 조건을 사용하여 데이터 정합성 보장
     */
    async getMyAllDocumentsStatistics(userId: string) {
        this.logger.debug(`내 전체 문서 통계 조회: 사용자 ${userId}`);

        // document-filter.builder.ts applyFilter switch 기준
        const filterTypes = [
            'DRAFT', // 임시저장함
            // 'RECEIVED', // 수신함
            'SUBMITTED', // 상신함
            'PENDING', // 미결함
            'APPROVED', // 기결함
            'REJECTED', // 반려함
            'IMPLEMENTATION', // 시행함
            'RECEIVED_REFERENCE', // 수신참조함
        ];

        const statistics: Record<string, number> = {};

        // 각 필터 타입별로 동일한 조건을 사용하여 개수 조회
        for (const filterType of filterTypes) {
            const qb = this.documentService.createQueryBuilder('document');

            // 공통 조건 적용 (FilterBuilder 사용)
            this.filterBuilder.applyFilter(qb, filterType, userId);

            // count 조회
            const count = await qb.getCount();
            statistics[filterType] = count;
        }

        return statistics;
    }

    // ============================================
    // 🔧 헬퍼 메서드
    // ============================================

    /**
     * 기안자의 부서/포지션 정보 추출
     * @param drafter 기안자 엔티티 (departmentPositions 관계 포함)
     */
    private extractDrafterDepartmentPosition(drafter: {
        id: string;
        employeeNumber: string;
        name: string;
        email?: string;
        departmentPositions?: Array<{
            isManager: boolean;
            department?: { id: string; departmentName: string; departmentCode: string };
            position?: { id: string; positionTitle: string; positionCode: string; level: number };
        }>;
    }) {
        if (!drafter) return null;

        // 기안자의 현재 부서/직책 정보 추출 (isManager가 true인 것 우선, 없으면 첫 번째)
        const currentDeptPos =
            drafter.departmentPositions?.find((dp) => dp.isManager) || drafter.departmentPositions?.[0];

        return {
            id: drafter.id,
            employeeNumber: drafter.employeeNumber,
            name: drafter.name,
            email: drafter.email || null,
            department: currentDeptPos?.department
                ? {
                      id: currentDeptPos.department.id,
                      departmentName: currentDeptPos.department.departmentName,
                      departmentCode: currentDeptPos.department.departmentCode,
                  }
                : null,
            position: currentDeptPos?.position
                ? {
                      id: currentDeptPos.position.id,
                      positionTitle: currentDeptPos.position.positionTitle,
                      positionCode: currentDeptPos.position.positionCode,
                      level: currentDeptPos.position.level,
                  }
                : null,
        };
    }
}
