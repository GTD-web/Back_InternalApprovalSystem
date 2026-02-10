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

            case 'PENDING_APPROVAL':
                this.applyPendingApprovalFilter(qb, userId);
                break;

            case 'PENDING_MINE':
                this.applyPendingMineFilter(qb, userId);
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
     * 아직 내 차례가 아닌 문서만: 내가 수신처로 지정된 문서 중, 내 앞에 PENDING 단계가 있는 문서 (결재진행중)
     * 합의(AGREEMENT)·결재(APPROVAL) 단계만 포함. receivedStepType으로 단계 타입 제한 가능.
     */
    private applyReceivedFilter(qb: SelectQueryBuilder<Document>, userId: string, receivedStepType?: string): void {
        const receivedStepTypes =
            receivedStepType === ApprovalStepType.AGREEMENT
                ? [ApprovalStepType.AGREEMENT]
                : receivedStepType === ApprovalStepType.APPROVAL
                  ? [ApprovalStepType.APPROVAL]
                  : [ApprovalStepType.AGREEMENT, ApprovalStepType.APPROVAL];

        qb.andWhere('document.drafterId != :userId', { userId })
            .andWhere('document.status = :pendingStatus', { pendingStatus: DocumentStatus.PENDING })
            .andWhere(
                `document.id IN (
                    SELECT DISTINCT my_step."documentId"
                    FROM approval_step_snapshots my_step
                    INNER JOIN documents d ON my_step."documentId" = d.id
                    WHERE d."drafterId" != :userId
                    AND my_step."approverId" = :userId
                    AND my_step."stepType" IN (:...receivedStepTypes)
                    AND my_step.status = :myPendingStatus
                    AND EXISTS (
                        SELECT 1
                        FROM approval_step_snapshots prior_step
                        WHERE prior_step."documentId" = my_step."documentId"
                        AND prior_step."stepOrder" < my_step."stepOrder"
                        AND prior_step.status = :priorPendingStatus
                    )
                )`,
                {
                    receivedStepTypes,
                    pendingStatus: DocumentStatus.PENDING,
                    myPendingStatus: ApprovalStatus.PENDING,
                    priorPendingStatus: ApprovalStatus.PENDING,
                },
            );
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
     * 미결함 필터 (현재 내가 결재·협의해야 하는 문서)
     * 결재진행중 + 내가 합의 또는 결재 단계에 있고 대기 중 + 앞선 순서 단계 모두 승인됨
     */
    private applyPendingMineFilter(qb: SelectQueryBuilder<Document>, userId: string): void {
        qb.andWhere('document.drafterId != :userId', { userId }).andWhere(
            `document.id IN (
                SELECT DISTINCT my_step."documentId"
                FROM approval_step_snapshots my_step
                INNER JOIN documents d ON my_step."documentId" = d.id
                WHERE my_step."approverId" = :userId
                AND my_step."stepType" IN (:...agreementApprovalTypes)
                AND d.status = :pendingStatus
                AND d."drafterId" != :userId
                AND my_step.status = :pendingStepStatus
                AND NOT EXISTS (
                    SELECT 1
                    FROM approval_step_snapshots prior_step
                    WHERE prior_step."documentId" = my_step."documentId"
                    AND prior_step."stepOrder" < my_step."stepOrder"
                    AND prior_step.status != :approvedStepStatus
                )
            )`,
            {
                agreementApprovalTypes: [ApprovalStepType.AGREEMENT, ApprovalStepType.APPROVAL],
                pendingStatus: DocumentStatus.PENDING,
                pendingStepStatus: ApprovalStatus.PENDING,
                approvedStepStatus: ApprovalStatus.APPROVED,
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
     * 기결함 필터
     * - 기안자: 내가 상신한 문서 중 승인완료·시행완료 (APPROVED, IMPLEMENTED)
     * - 결재자: 내가 합의·결재에 승인한 문서 (문서 상태 PENDING/APPROVED/IMPLEMENTED)
     * - drafterFilter: MY_DRAFT(기안만), PARTICIPATED(참여만), 미지정(둘 다)
     */
    private applyApprovedFilter(qb: SelectQueryBuilder<Document>, userId: string, drafterFilter?: string): void {
        if (drafterFilter === 'MY_DRAFT') {
            qb.andWhere('document.drafterId = :userId', { userId }).andWhere(
                'document.status IN (:...drafterStatuses)',
                { drafterStatuses: [DocumentStatus.APPROVED, DocumentStatus.IMPLEMENTED] },
            );
            return;
        }
        if (drafterFilter === 'PARTICIPATED') {
            qb.andWhere('document.drafterId != :userId', { userId })
                .andWhere('document.status IN (:...participatedDocStatuses)', {
                    participatedDocStatuses: [DocumentStatus.PENDING, DocumentStatus.APPROVED, DocumentStatus.IMPLEMENTED],
                })
                .andWhere(
                    `document.id IN (
                SELECT DISTINCT ass."documentId"
                FROM approval_step_snapshots ass
                WHERE ass."approverId" = :userId
                AND ass."stepType" IN (:...agreementApprovalTypes)
                AND ass.status = :approvedStepStatus
            )`,
                    {
                        agreementApprovalTypes: [ApprovalStepType.AGREEMENT, ApprovalStepType.APPROVAL],
                        approvedStepStatus: ApprovalStatus.APPROVED,
                    },
                );
            return;
        }
        qb.andWhere(
            `(
                (document.drafterId = :userId AND document.status IN (:...drafterStatuses))
                OR
                (document.drafterId != :userId AND document.status IN (:...participatedDocStatuses) AND document.id IN (
                    SELECT DISTINCT ass."documentId"
                    FROM approval_step_snapshots ass
                    WHERE ass."approverId" = :userId
                    AND ass."stepType" IN (:...agreementApprovalTypes)
                    AND ass.status = :approvedStepStatus
                ))
            )`,
            {
                userId,
                drafterStatuses: [DocumentStatus.APPROVED, DocumentStatus.IMPLEMENTED],
                participatedDocStatuses: [DocumentStatus.PENDING, DocumentStatus.APPROVED, DocumentStatus.IMPLEMENTED],
                agreementApprovalTypes: [ApprovalStepType.AGREEMENT, ApprovalStepType.APPROVAL],
                approvedStepStatus: ApprovalStatus.APPROVED,
            },
        );
    }

    /**
     * 반려함 필터 (내가 합의·결재자로 있는 문서 중 반려된 문서)
     * - 결재자 전용: stepType IN (AGREEMENT, APPROVAL)
     */
    private applyRejectedFilter(qb: SelectQueryBuilder<Document>, userId: string, _drafterFilter?: string): void {
        qb.andWhere('document.drafterId != :userId', { userId })
            .andWhere('document.status = :rejectedStatus', { rejectedStatus: DocumentStatus.REJECTED })
            .andWhere(
                `document.id IN (
                SELECT DISTINCT ass."documentId"
                FROM approval_step_snapshots ass
                WHERE ass."approverId" = :rejectedUserId
                AND ass."stepType" IN (:...rejectedAgreementApprovalTypes)
            )`,
                {
                    rejectedUserId: userId,
                    rejectedAgreementApprovalTypes: [ApprovalStepType.AGREEMENT, ApprovalStepType.APPROVAL],
                },
            );
    }

    /**
     * 수신참조함 필터
     * 내가 참조자(REFERENCE)로 있는 문서, 문서 상태 무관. 옵션으로 미열람/열람 필터.
     */
    private applyReceivedReferenceFilter(
        qb: SelectQueryBuilder<Document>,
        userId: string,
        referenceReadStatus?: string,
    ): void {
        qb.andWhere('document.drafterId != :userId', { userId });

        if (referenceReadStatus) {
            const statusCondition = referenceReadStatus === 'READ' ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING;
            qb.andWhere(
                `document.id IN (
                    SELECT ass."documentId"
                    FROM approval_step_snapshots ass
                    WHERE ass."stepType" = :referenceType
                    AND ass."approverId" = :userId
                    AND ass.status = :referenceStatus
                )`,
                {
                    referenceType: ApprovalStepType.REFERENCE,
                    referenceStatus: statusCondition,
                },
            );
        } else {
            qb.andWhere(
                `document.id IN (
                    SELECT ass."documentId"
                    FROM approval_step_snapshots ass
                    WHERE ass."stepType" = :referenceType
                    AND ass."approverId" = :userId
                )`,
                { referenceType: ApprovalStepType.REFERENCE },
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
