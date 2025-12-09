import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ApprovalProcessContext } from '../../../context/approval-process/approval-process.context';
import { DocumentContext } from '../../../context/document/document.context';
import { DocumentQueryService } from '../../../context/document/document-query.service';
import { DocumentNotificationService } from '../../../context/notification/document-notification.service';
import { withTransaction } from 'src/common/utils/transaction.util';
import {
    ApproveStepDto,
    RejectStepDto,
    CompleteAgreementDto,
    CompleteImplementationDto,
    CancelApprovalDto,
    CancelApprovalStepDto,
    ProcessApprovalActionDto,
    ApprovalActionType,
} from '../dtos';

/**
 * 결재 프로세스 비즈니스 서비스
 * 결재 승인/반려, 협의 완료, 시행 완료, 결재 취소 등의 비즈니스 로직을 담당합니다.
 */
@Injectable()
export class ApprovalProcessService {
    private readonly logger = new Logger(ApprovalProcessService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly approvalProcessContext: ApprovalProcessContext,
        private readonly documentContext: DocumentContext,
        private readonly documentQueryService: DocumentQueryService,
        private readonly documentNotificationService: DocumentNotificationService,
    ) {}

    /**
     * 결재 승인
     */
    async approveStep(dto: ApproveStepDto, approverId: string) {
        this.logger.log(`결재 승인 요청: ${dto.stepSnapshotId}`);

        const result = await withTransaction(this.dataSource, async (queryRunner) => {
            return await this.approvalProcessContext.approveStep(
                {
                    ...dto,
                    approverId: approverId,
                },
                queryRunner,
            );
        });

        // 알림 전송 (비동기)
        this.sendApproveNotification(result.documentId, result.id, result.approver.employeeNumber).catch((error) => {
            this.logger.error('결재 승인 알림 전송 실패', error);
        });

        return result;
    }

    /**
     * 결재 반려
     */
    async rejectStep(dto: RejectStepDto, rejecterId: string) {
        this.logger.log(`결재 반려 요청: ${dto.stepSnapshotId}`);

        const result = await withTransaction(this.dataSource, async (queryRunner) => {
            return await this.approvalProcessContext.rejectStep(
                {
                    ...dto,
                    approverId: rejecterId,
                },
                queryRunner,
            );
        });

        // 알림 전송 (비동기)
        this.sendRejectNotification(result.documentId, dto.comment, result.approver.employeeNumber).catch((error) => {
            this.logger.error('결재 반려 알림 전송 실패', error);
        });

        return result;
    }

    /**
     * 협의 완료
     */
    async completeAgreement(dto: CompleteAgreementDto, agreerId: string) {
        this.logger.log(`협의 완료 요청: ${dto.stepSnapshotId}`);

        const result = await withTransaction(this.dataSource, async (queryRunner) => {
            return await this.approvalProcessContext.completeAgreement(
                {
                    ...dto,
                    agreerId: agreerId,
                },
                queryRunner,
            );
        });

        // 알림 전송 (비동기)
        this.sendCompleteAgreementNotification(result.documentId, result.approver.employeeNumber).catch((error) => {
            this.logger.error('협의 완료 알림 전송 실패', error);
        });

        return result;
    }

    /**
     * 시행 완료
     */
    async completeImplementation(dto: CompleteImplementationDto, implementerId: string) {
        this.logger.log(`시행 완료 요청: ${dto.stepSnapshotId}`);

        const result = await withTransaction(this.dataSource, async (queryRunner) => {
            return await this.approvalProcessContext.completeImplementation(
                {
                    ...dto,
                    implementerId: implementerId,
                },
                queryRunner,
            );
        });

        // 알림 전송 (비동기)
        this.sendCompleteImplementationNotification(result.documentId, result.approver.employeeNumber).catch(
            (error) => {
                this.logger.error('시행 완료 알림 전송 실패', error);
            },
        );

        return result;
    }

    /**
     * 참조 열람 확인
     */
    async markReferenceRead(dto: { stepSnapshotId: string; comment?: string }, referenceUserId: string) {
        this.logger.log(`참조 열람 확인 요청: ${dto.stepSnapshotId}`);

        const result = await withTransaction(this.dataSource, async (queryRunner) => {
            return await this.approvalProcessContext.markReferenceRead(
                {
                    stepSnapshotId: dto.stepSnapshotId,
                    referenceUserId: referenceUserId,
                    comment: dto.comment,
                },
                queryRunner,
            );
        });

        return result;
    }

    /**
     * 결재취소 (결재자용)
     * 정책: 본인이 승인한 상태이고, 다음 단계가 처리되지 않은 상태에서만 가능
     */
    async cancelApprovalStep(dto: CancelApprovalStepDto, approverId: string) {
        this.logger.log(`결재 취소 요청: ${dto.stepSnapshotId}, 결재자: ${approverId}`);

        return await withTransaction(this.dataSource, async (queryRunner) => {
            return await this.approvalProcessContext.결재를취소한다(
                {
                    ...dto,
                    approverId: approverId,
                },
                queryRunner,
            );
        });
    }

    /**
     * @deprecated cancelSubmit과 cancelApprovalStep으로 분리됨
     */
    // async cancelApproval(dto: CancelApprovalDto, cancelerId: string) {
    //     this.logger.log(`결재 취소 요청: ${dto.documentId}`);

    //     return await withTransaction(this.dataSource, async (queryRunner) => {
    //         return await this.approvalProcessContext.cancelApproval(
    //             {
    //                 ...dto,
    //                 requesterId: cancelerId,
    //             },
    //             queryRunner,
    //         );
    //     });
    // }

    /**
     * 내 결재 대기 목록 조회 (페이징, 필터링)
     */
    async getMyPendingApprovals(
        userId: string,
        type: 'SUBMITTED' | 'AGREEMENT' | 'APPROVAL',
        page: number,
        limit: number,
    ) {
        this.logger.debug(`내 결재 대기 목록 조회: userId=${userId}, type=${type}, page=${page}, limit=${limit}`);
        return await this.approvalProcessContext.getMyPendingApprovals(userId, type, page, limit);
    }

    /**
     * 문서의 결재 단계 목록 조회
     */
    async getApprovalSteps(documentId: string) {
        this.logger.debug(`문서 결재 단계 목록 조회: ${documentId}`);
        return await this.approvalProcessContext.getApprovalSteps(documentId);
    }

    /**
     * 통합 결재 액션 처리
     * 승인, 반려, 협의 완료, 시행 완료, 취소를 하나의 API로 처리합니다.
     */
    // async processApprovalAction(dto: ProcessApprovalActionDto, approverId: string) {
    //     this.logger.log(`통합 결재 액션 처리 요청: ${dto.type}`);

    //     switch (dto.type) {
    //         case ApprovalActionType.APPROVE:
    //             if (!dto.stepSnapshotId) {
    //                 throw new BadRequestException('stepSnapshotId는 필수입니다.');
    //             }
    //             return await this.approveStep(
    //                 {
    //                     stepSnapshotId: dto.stepSnapshotId,
    //                     comment: dto.comment,
    //                 },
    //                 approverId,
    //             );

    //         case ApprovalActionType.REJECT:
    //             if (!dto.stepSnapshotId) {
    //                 throw new BadRequestException('stepSnapshotId는 필수입니다.');
    //             }
    //             if (!dto.comment) {
    //                 throw new BadRequestException('반려 시 사유(comment)는 필수입니다.');
    //             }
    //             return await this.rejectStep(
    //                 {
    //                     stepSnapshotId: dto.stepSnapshotId,
    //                     comment: dto.comment,
    //                 },
    //                 approverId,
    //             );

    //         case ApprovalActionType.COMPLETE_AGREEMENT:
    //             if (!dto.stepSnapshotId) {
    //                 throw new BadRequestException('stepSnapshotId는 필수입니다.');
    //             }
    //             return await this.completeAgreement(
    //                 {
    //                     stepSnapshotId: dto.stepSnapshotId,
    //                     comment: dto.comment,
    //                 },
    //                 approverId,
    //             );

    //         case ApprovalActionType.COMPLETE_IMPLEMENTATION:
    //             if (!dto.stepSnapshotId) {
    //                 throw new BadRequestException('stepSnapshotId는 필수입니다.');
    //             }
    //             return await this.completeImplementation(
    //                 {
    //                     stepSnapshotId: dto.stepSnapshotId,
    //                     comment: dto.comment,
    //                     resultData: dto.resultData,
    //                 },
    //                 approverId,
    //             );

    //         case ApprovalActionType.MARK_REFERENCE_READ:
    //             if (!dto.stepSnapshotId) {
    //                 throw new BadRequestException('stepSnapshotId는 필수입니다.');
    //             }
    //             return await this.markReferenceRead(
    //                 {
    //                     stepSnapshotId: dto.stepSnapshotId,
    //                     comment: dto.comment,
    //                 },
    //                 approverId,
    //             );

    //         case ApprovalActionType.CANCEL:
    //             if (!dto.documentId) {
    //                 throw new BadRequestException('documentId는 필수입니다.');
    //             }
    //             if (!dto.reason) {
    //                 throw new BadRequestException('취소 사유(reason)는 필수입니다.');
    //             }
    //             return await this.cancelApproval(
    //                 {
    //                     documentId: dto.documentId,
    //                     reason: dto.reason,
    //                 },
    //                 approverId,
    //             );

    //         default:
    //             throw new BadRequestException(`지원하지 않는 액션 타입입니다: ${dto.type}`);
    //     }
    // }

    /**
     * ============================================
     * Private 알림 전송 메서드
     * ============================================
     */

    /**
     * 결재 승인 알림 전송
     */
    private async sendApproveNotification(
        documentId: string,
        currentStepId: string,
        approverEmployeeNumber: string,
    ): Promise<void> {
        try {
            const document = await this.documentQueryService.getDocument(documentId);
            const allSteps = await this.approvalProcessContext.getApprovalStepsByDocumentId(documentId);

            await this.documentNotificationService.sendNotificationAfterApprove({
                document: {
                    id: document.id,
                    title: document.title,
                    drafterId: document.drafterId,
                    drafterName: document.drafter?.name,
                    status: document.status,
                },
                allSteps,
                currentStepId,
                approverEmployeeNumber,
            });
        } catch (error) {
            this.logger.error(`결재 승인 알림 전송 중 오류 발생: ${documentId}`, error);
            throw error;
        }
    }

    /**
     * 결재 반려 알림 전송
     */
    private async sendRejectNotification(
        documentId: string,
        rejectReason: string,
        rejecterEmployeeNumber: string,
    ): Promise<void> {
        try {
            const document = await this.documentQueryService.getDocument(documentId);

            await this.documentNotificationService.sendNotificationAfterReject({
                document: {
                    id: document.id,
                    title: document.title,
                    drafterId: document.drafterId,
                    drafterName: document.drafter?.name,
                    status: document.status,
                },
                rejectReason,
                rejecterEmployeeNumber,
            });
        } catch (error) {
            this.logger.error(`결재 반려 알림 전송 중 오류 발생: ${documentId}`, error);
            throw error;
        }
    }

    /**
     * 협의 완료 알림 전송
     */
    private async sendCompleteAgreementNotification(documentId: string, agreerEmployeeNumber: string): Promise<void> {
        try {
            const document = await this.documentQueryService.getDocument(documentId);
            const allSteps = await this.approvalProcessContext.getApprovalStepsByDocumentId(documentId);

            await this.documentNotificationService.sendNotificationAfterCompleteAgreement({
                document: {
                    id: document.id,
                    title: document.title,
                    drafterId: document.drafterId,
                    drafterName: document.drafter?.name,
                    status: document.status,
                },
                allSteps,
                agreerEmployeeNumber,
            });
        } catch (error) {
            this.logger.error(`협의 완료 알림 전송 중 오류 발생: ${documentId}`, error);
            throw error;
        }
    }

    /**
     * 시행 완료 알림 전송
     */
    private async sendCompleteImplementationNotification(
        documentId: string,
        implementerEmployeeNumber: string,
    ): Promise<void> {
        try {
            const document = await this.documentQueryService.getDocument(documentId);
            const allSteps = await this.approvalProcessContext.getApprovalStepsByDocumentId(documentId);

            await this.documentNotificationService.sendNotificationAfterCompleteImplementation({
                document: {
                    id: document.id,
                    title: document.title,
                    drafterId: document.drafterId,
                    drafterName: document.drafter?.name,
                    status: document.status,
                },
                allSteps,
                implementerEmployeeNumber,
            });
        } catch (error) {
            this.logger.error(`시행 완료 알림 전송 중 오류 발생: ${documentId}`, error);
            throw error;
        }
    }
}
