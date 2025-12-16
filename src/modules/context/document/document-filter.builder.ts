import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { Document } from '../../domain/document/document.entity';
import { DocumentStatus, ApprovalStatus, ApprovalStepType } from '../../../common/enums/approval.enum';

/**
 * 문서 필터 쿼리 빌더
 *
 * 역할:
 * - 복잡한 문서 필터링 조건을 QueryBuilder에 적용
 * - 각 필터 타입별 독립된 메서드로 관리
 * - 쿼리 로직의 재사용성 및 테스트 용이성 향상
 */
@Injectable()
export class DocumentFilterBuilder {
    /**
     * 필터 타입에 따라 적절한 조건을 QueryBuilder에 적용
     */
    applyFilter(
        qb: SelectQueryBuilder<Document>,
        filterType: string,
        userId: string,
        options?: {
            receivedStepType?: string;
            drafterFilter?: string;
            referenceReadStatus?: string;
            pendingStatusFilter?: string;
            agreementStepStatus?: string;
        },
    ): void {
        switch (filterType) {
            case 'DRAFT':
                this.applyDraftFilter(qb, userId);
                break;

            case 'PENDING':
                this.applyPendingFilter(qb, userId, options?.pendingStatusFilter);
                break;

            case 'RECEIVED':
                this.applyReceivedFilter(qb, userId, options?.receivedStepType);
                break;

            case 'PENDING_AGREEMENT':
                this.applyPendingAgreementFilter(qb, userId, options?.agreementStepStatus);
                break;

            case 'PENDING_APPROVAL':
                this.applyPendingApprovalFilter(qb, userId);
                break;

            case 'IMPLEMENTATION':
                this.applyImplementationFilter(qb, userId);
                break;

            case 'APPROVED':
                this.applyApprovedFilter(qb, userId, options?.drafterFilter);
                break;

            case 'REJECTED':
                this.applyRejectedFilter(qb, userId, options?.drafterFilter);
                break;

            case 'RECEIVED_REFERENCE':
                this.applyReceivedReferenceFilter(qb, userId, options?.referenceReadStatus);
                break;

            case 'ALL':
            default:
                this.applyAllFilter(qb, userId);
                break;
        }
    }

    /**
     * 임시저장 필터 (내가 임시 저장한 문서)
     */
    private applyDraftFilter(qb: SelectQueryBuilder<Document>, userId: string): void {
        qb.andWhere('document.drafterId = :userId', { userId }).andWhere('document.status = :status', {
            status: DocumentStatus.DRAFT,
        });
    }

    /**
     * 상신함 필터 (내가 상신한 문서 - DRAFT 제외한 모든 상태 또는 특정 상태)
     * @param pendingStatusFilter - 특정 문서 상태로 필터링 (PENDING, APPROVED, REJECTED, CANCELLED, IMPLEMENTED)
     */
    private applyPendingFilter(qb: SelectQueryBuilder<Document>, userId: string, pendingStatusFilter?: string): void {
        qb.andWhere('document.drafterId = :userId', { userId });

        if (pendingStatusFilter) {
            // 특정 상태로 필터링
            const statusMap: Record<string, DocumentStatus> = {
                PENDING: DocumentStatus.PENDING,
                APPROVED: DocumentStatus.APPROVED,
                REJECTED: DocumentStatus.REJECTED,
                CANCELLED: DocumentStatus.CANCELLED,
                IMPLEMENTED: DocumentStatus.IMPLEMENTED,
            };

            const targetStatus = statusMap[pendingStatusFilter];
            if (targetStatus) {
                qb.andWhere('document.status = :targetStatus', { targetStatus });
            } else {
                // 유효하지 않은 상태는 DRAFT 제외로 fallback
                qb.andWhere('document.status != :draftStatus', { draftStatus: DocumentStatus.DRAFT });
            }
        } else {
            // 기본: DRAFT 제외한 모든 상태
            qb.andWhere('document.status != :draftStatus', { draftStatus: DocumentStatus.DRAFT });
        }
    }

    /**
     * 수신함 필터
     * 내가 결재라인에 있지만 현재 내 차례가 아닌 문서들
     * - 아직 내 차례가 아닌 것 (SCHEDULED): 내 앞에 PENDING 단계가 있음
     * - 이미 처리한 것 (COMPLETED): 내 단계가 APPROVED 상태
     * - 상신취소된 문서 (CANCELLED): 결재라인에 있는 모든 결재자에게 표시
     * 합의(AGREEMENT)와 결재(APPROVAL)만 포함, 시행(IMPLEMENTATION)과 참조(REFERENCE)는 제외
     */
    private applyReceivedFilter(qb: SelectQueryBuilder<Document>, userId: string, receivedStepType?: string): void {
        const receivedStepTypes = [ApprovalStepType.APPROVAL];

        qb.andWhere('document.drafterId != :userId', { userId })
            .andWhere('document.status IN (:...receivedStatuses)', {
                receivedStatuses: [DocumentStatus.PENDING],
            })
            .andWhere(
                `document.id IN (
                    SELECT DISTINCT d.id
                    FROM documents d
                    INNER JOIN approval_step_snapshots my_step ON d.id = my_step."documentId"
                    WHERE d."drafterId" != :userId
                    AND my_step."approverId" = :userId
                    AND my_step."stepType" IN (:...receivedStepTypes)
                    AND (
                        d.status = :pendingStatus
                            AND (
                                -- 아직 내 차례가 아닌 것 (앞에 PENDING 단계가 있음)
                                EXISTS (
                                    SELECT 1
                                    FROM approval_step_snapshots prior_step
                                    WHERE prior_step."documentId" = my_step."documentId"
                                    AND prior_step."stepOrder" < my_step."stepOrder"
                                    AND prior_step.status = :pendingStepStatus
                                )
                                OR
                                -- 내 차례가 지나간 것 (내 단계가 APPROVED)
                                my_step.status = :approvedStepStatus
                        )    
                    )
                )`,
                {
                    receivedStepTypes,
                    cancelledStatus: DocumentStatus.CANCELLED,
                    pendingStatus: DocumentStatus.PENDING,
                    pendingStepStatus: ApprovalStatus.PENDING,
                    approvedStepStatus: ApprovalStatus.APPROVED,
                },
            );
    }

    /**
     * 합의함 필터 (내가 합의자로 있는 문서)
     * @param agreementStepStatus - 합의 단계 상태 필터
     *   - SCHEDULED: 아직 내 차례가 아닌 상태 (앞에 PENDING 단계 있음)
     *   - PENDING: 내 차례인 상태 (현재 합의 대기)
     *   - COMPLETED: 내 차례가 완료된 상태 (이미 합의 완료)
     */
    private applyPendingAgreementFilter(
        qb: SelectQueryBuilder<Document>,
        userId: string,
        agreementStepStatus?: string,
    ): void {
        qb.andWhere('document.drafterId != :userId', { userId });

        if (agreementStepStatus === 'SCHEDULED') {
            // 아직 내 차례가 아닌 상태: 내 앞에 PENDING 상태의 단계가 있음
            qb.andWhere(
                `document.id IN (
                    SELECT DISTINCT my_step."documentId"
                    FROM approval_step_snapshots my_step
                    INNER JOIN documents d ON my_step."documentId" = d.id
                    WHERE my_step."approverId" = :userId
                    AND my_step."stepType" = :agreementType
                    AND d.status = :pendingStatus
                    AND d."drafterId" != :userId
                    AND my_step.status = :pendingStepStatus
                    AND EXISTS (
                        SELECT 1
                        FROM approval_step_snapshots prior_step
                        WHERE prior_step."documentId" = my_step."documentId"
                        AND prior_step."stepOrder" < my_step."stepOrder"
                        AND prior_step.status = :pendingStepStatus
                    )
                )`,
                {
                    pendingStatus: DocumentStatus.PENDING,
                    agreementType: ApprovalStepType.AGREEMENT,
                    pendingStepStatus: ApprovalStatus.PENDING,
                },
            );
        } else if (agreementStepStatus === 'PENDING') {
            // 내 차례인 상태: 내 앞에 PENDING 상태의 단계가 없고, 내 단계가 PENDING
            qb.andWhere(
                `document.id IN (
                    SELECT DISTINCT my_step."documentId"
                    FROM approval_step_snapshots my_step
                    INNER JOIN documents d ON my_step."documentId" = d.id
                    WHERE my_step."approverId" = :userId
                    AND my_step."stepType" = :agreementType
                    AND d.status = :pendingStatus
                    AND d."drafterId" != :userId
                    AND my_step.status = :pendingStepStatus
                    AND NOT EXISTS (
                        SELECT 1
                        FROM approval_step_snapshots prior_step
                        WHERE prior_step."documentId" = my_step."documentId"
                        AND prior_step."stepOrder" < my_step."stepOrder"
                        AND prior_step.status = :pendingStepStatus
                    )
                )`,
                {
                    pendingStatus: DocumentStatus.PENDING,
                    agreementType: ApprovalStepType.AGREEMENT,
                    pendingStepStatus: ApprovalStatus.PENDING,
                },
            );
        } else if (agreementStepStatus === 'COMPLETED') {
            // 내 차례가 완료된 상태: 내 단계가 APPROVED
            qb.andWhere(
                `document.id IN (
                    SELECT DISTINCT my_step."documentId"
                    FROM approval_step_snapshots my_step
                    INNER JOIN documents d ON my_step."documentId" = d.id
                    WHERE my_step."approverId" = :userId
                    AND my_step."stepType" = :agreementType
                    AND d.status = :pendingStatus
                    AND d."drafterId" != :userId
                    AND my_step.status = :approvedStepStatus
                )`,
                {
                    pendingStatus: DocumentStatus.PENDING,
                    agreementType: ApprovalStepType.AGREEMENT,
                    approvedStepStatus: ApprovalStatus.APPROVED,
                },
            );
        } else {
            // 기본: 모든 합의 문서 (내가 합의자로 있는 모든 진행중 문서)
            qb.andWhere(
                `document.id IN (
                    SELECT DISTINCT my_step."documentId"
                    FROM approval_step_snapshots my_step
                    INNER JOIN documents d ON my_step."documentId" = d.id
                    WHERE my_step."approverId" = :userId
                    AND my_step."stepType" = :agreementType
                    AND d.status = :pendingStatus
                    AND d."drafterId" != :userId
                )`,
                {
                    pendingStatus: DocumentStatus.PENDING,
                    agreementType: ApprovalStepType.AGREEMENT,
                },
            );
        }
    }

    /**
     * 결재함 필터 (현재 내가 결재해야 하는 문서)
     */
    private applyPendingApprovalFilter(qb: SelectQueryBuilder<Document>, userId: string): void {
        qb.andWhere('document.drafterId != :userId', { userId }).andWhere(
            `document.id IN (
                SELECT DISTINCT my_step."documentId"
                FROM approval_step_snapshots my_step
                INNER JOIN documents d ON my_step."documentId" = d.id
                WHERE my_step."approverId" = :userId
                AND my_step."stepType" = :approvalType
                AND d.status = :pendingStatus
                AND d."drafterId" != :userId
                AND my_step.status = :pendingStepStatus
                AND NOT EXISTS (
                    SELECT 1
                    FROM approval_step_snapshots prior_step
                    WHERE prior_step."documentId" = my_step."documentId"
                    AND prior_step."stepOrder" < my_step."stepOrder"
                    AND prior_step.status = :pendingStepStatus
                )
            )`,
            {
                pendingStatus: DocumentStatus.PENDING,
                approvalType: ApprovalStepType.APPROVAL,
                pendingStepStatus: ApprovalStatus.PENDING,
            },
        );
    }

    /**
     * 시행함 필터 (현재 내가 시행해야 하는 문서)
     * - 문서 상태가 APPROVED (결재 완료)
     * - 내가 시행자로 있으면서 아직 시행하지 않은 것 (PENDING 상태)
     */
    private applyImplementationFilter(qb: SelectQueryBuilder<Document>, userId: string): void {
        qb.andWhere(
            `document.id IN (
                SELECT DISTINCT d.id
                FROM documents d
                INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
                WHERE d.status = :approvedStatus
                
                AND ass."approverId" = :userId
                AND ass."stepType" = :implementationType
                AND ass.status = :pendingStepStatus
            )`,
            {
                userId,
                approvedStatus: DocumentStatus.APPROVED,
                implementationType: ApprovalStepType.IMPLEMENTATION,
                pendingStepStatus: ApprovalStatus.PENDING,
            },
        );
    }

    /**
     * 기결함 필터 (모든 결재가 끝난 문서)
     * - drafterFilter로 내가 기안한 것 또는 참여한 것만 필터링 가능
     */
    private applyApprovedFilter(qb: SelectQueryBuilder<Document>, userId: string, drafterFilter?: string): void {
        // 내가 참여한 문서만 (기안자가 아닌 경우)
        qb.andWhere('document.drafterId != :userId', { userId }).andWhere(
            `document.id IN (
                SELECT DISTINCT d.id
                FROM documents d
                INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
                WHERE ass."approverId" = :userId
                AND d.status IN (:...completedStatuses)
            )`,
            {
                completedStatuses: [DocumentStatus.APPROVED, DocumentStatus.IMPLEMENTED],
            },
        );
    }

    /**
     * 반려함 필터 (반려된 문서)
     * - drafterFilter로 내가 기안한 것 또는 참여한 것만 필터링 가능
     */
    private applyRejectedFilter(qb: SelectQueryBuilder<Document>, userId: string, drafterFilter?: string): void {
        // 내가 참여한 문서만 (기안자가 아닌 경우)
        qb.andWhere('document.drafterId != :userId', { userId }).andWhere(
            `document.id IN (
                SELECT DISTINCT d.id
                FROM documents d
                INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
                WHERE ass."approverId" = :userId
                AND d.status = :rejectedStatus
            )`,
            {
                rejectedStatus: DocumentStatus.REJECTED,
            },
        );
    }

    /**
     * 수신참조함 필터
     * 내가 참조자로 있는 문서, 내가 기안한 문서 제외, IMPLEMENTED 상태만
     */
    private applyReceivedReferenceFilter(
        qb: SelectQueryBuilder<Document>,
        userId: string,
        referenceReadStatus?: string,
    ): void {
        qb.andWhere('document.drafterId != :userId', { userId }).andWhere('document.status IN (:...approvedStatuses)', {
            approvedStatuses: [DocumentStatus.APPROVED, DocumentStatus.REJECTED, DocumentStatus.IMPLEMENTED],
        });

        // 기본 조건: 내가 참조자로 있는 문서
        if (referenceReadStatus) {
            // 열람 여부 필터링
            const statusCondition = referenceReadStatus === 'READ' ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING;

            qb.andWhere(
                `document.id IN (
                    SELECT d.id
                    FROM documents d
                    INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
                    WHERE ass."stepType" = :referenceType
                    AND ass."approverId" = :userId
                    AND ass."status" = :referenceStatus
                    AND d.status IN (:...approvedStatuses)
                )`,
                {
                    referenceType: ApprovalStepType.REFERENCE,
                    referenceStatus: statusCondition,
                },
            );
        } else {
            // 열람 여부 필터링 없이 모든 참조 문서
            qb.andWhere(
                `document.id IN (
                    SELECT d.id
                    FROM documents d
                    INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
                    WHERE ass."stepType" = :referenceType
                    AND ass."approverId" = :userId
                    AND d.status IN (:...approvedStatuses)
                )`,
                {
                    referenceType: ApprovalStepType.REFERENCE,
                },
            );
        }
    }

    /**
     * 전체 문서 필터 (내가 기안한 문서 + 내가 참여하는 문서)
     */
    private applyAllFilter(qb: SelectQueryBuilder<Document>, userId: string): void {
        qb.andWhere(
            `(
                document.drafterId = :userId
                OR
                document.id IN (
                    SELECT d.id
                    FROM documents d
                    INNER JOIN approval_step_snapshots ass ON d.id = ass."documentId"
                    WHERE ass."approverId" = :userId
                    AND d.status != :draftStatus
                )
            )`,
            {
                userId,
                draftStatus: DocumentStatus.DRAFT,
            },
        );
    }
}
