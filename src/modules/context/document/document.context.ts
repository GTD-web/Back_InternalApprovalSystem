import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource, DeepPartial, QueryRunner } from 'typeorm';
import { Document } from '../../domain/document/document.entity';
import { DomainDocumentService } from '../../domain/document/document.service';
import { DomainDocumentTemplateService } from '../../domain/document-template/document-template.service';
import { DomainEmployeeService } from '../../domain/employee/employee.service';
import { DomainApprovalStepSnapshotService } from '../../domain/approval-step-snapshot/approval-step-snapshot.service';
import { CreateDocumentDto, UpdateDocumentDto, SubmitDocumentDto, CancelSubmitDto } from './dtos/document.dto';
import { DocumentStatus, ApprovalStepType, ApprovalStatus } from '../../../common/enums/approval.enum';
import { withTransaction } from '../../../common/utils/transaction.util';
import { ApproverSnapshotMetadata } from '../../domain/approval-step-snapshot/approval-step-snapshot.entity';
import { DocumentPolicyValidator } from '../../../common/utils/document-policy.validator';
import { DomainCommentService } from '../../domain/comment/comment.service';

/**
 * 문서 수정 이력 항목 인터페이스
 */
export interface DocumentModificationHistoryItem {
    previousTitle: string;
    previousContent: string;
    modifiedAt: string;
    modificationComment: string;
    documentStatus: DocumentStatus;
}

/**
 * 문서 컨텍스트
 *
 * 역할:
 * - 문서 작성, 수정, 삭제 (CRUD)
 * - 문서 임시저장 (초안)
 * - 문서 기안 (상신)
 * - 결재선 스냅샷 관리 (생성/수정/검증)
 * - 문서 번호 자동 생성
 *
 * 참고:
 * - 문서 조회 및 통계: DocumentQueryService 사용
 */
@Injectable()
export class DocumentContext {
    private readonly logger = new Logger(DocumentContext.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly documentService: DomainDocumentService,
        private readonly documentTemplateService: DomainDocumentTemplateService,
        private readonly employeeService: DomainEmployeeService,
        private readonly approvalStepSnapshotService: DomainApprovalStepSnapshotService,
        private readonly commentService: DomainCommentService,
    ) {}

    // ============================================
    // 📝 문서 CRUD 작업
    // ============================================

    /**
     * 문서 생성 (임시저장)
     */
    async createDocument(dto: CreateDocumentDto, queryRunner?: QueryRunner) {
        this.logger.log(`문서 생성 시작: ${dto.title}`);

        // 1) DocumentTemplate 존재 확인 (documentTemplateId가 있는 경우에만)
        if (dto.documentTemplateId) {
            await this.documentTemplateService.findOneWithError({
                where: { id: dto.documentTemplateId },
            });
        }

        // 2) 기안자 확인
        await this.employeeService.findOneWithError({
            where: { id: dto.drafterId },
        });

        const documentDto: DeepPartial<Document> = {
            title: dto.title,
            content: dto.content,
            drafterId: dto.drafterId,
            documentTemplateId: dto.documentTemplateId,
            metadata: dto.metadata,
        };
        // 3) Document 생성 (임시저장 시 문서 번호는 생성하지 않음)
        const document = await this.documentService.createDocument(documentDto, queryRunner);
        return document;
    }

    /**
     * 문서 수정
     * 참고: 정책 검증은 Business Service에서 수행됨 (DocumentPolicyValidator)
     */
    async updateDocument(documentId: string, dto: UpdateDocumentDto, queryRunner?: QueryRunner) {
        this.logger.log(`문서 수정 시작: ${documentId}`);

        // 1) Document 조회
        const document = await this.documentService.findOneWithError({
            where: { id: documentId },
            queryRunner,
        });

        if (dto.metadata) {
            document.메타데이터를설정한다(dto.metadata);
        }

        // 2) 타이틀/컨텐츠가 수정된 경우 메타데이터에 수정 이력 추가
        const isTitleOrContentUpdated = dto.title !== undefined || dto.content !== undefined;
        let updatedMetadata = document.metadata;

        if (isTitleOrContentUpdated) {
            updatedMetadata = this.buildUpdatedMetadata(document, dto);
        }

        // 4) Document 업데이트 (Domain Service 활용)
        const updatedDocument = await this.documentService.updateDocument(
            document,
            {
                title: dto.title,
                content: dto.content,
                comment: dto.comment,
                metadata: updatedMetadata,
            },
            queryRunner,
        );

        // 5) 결재단계 스냅샷 수정 (제공된 경우)
        if (dto.approvalSteps !== undefined) {
            await this.updateApprovalStepSnapshots(documentId, dto.approvalSteps, queryRunner!);
        }

        this.logger.log(`문서 수정 완료: ${documentId}`);
        return updatedDocument;
    }

    /**
     * 문서 삭제
     * 참고: 정책 검증은 Business Service에서 수행됨 (DocumentPolicyValidator)
     */
    async deleteDocument(documentId: string, externalQueryRunner?: QueryRunner) {
        this.logger.log(`문서 삭제 시작: ${documentId}`);

        return await withTransaction(
            this.dataSource,
            async (queryRunner) => {
                // 1) Document 존재 확인
                await this.documentService.findOneWithError({
                    where: { id: documentId },
                    queryRunner,
                });

                // 2) 삭제
                await this.documentService.delete(documentId, { queryRunner });

                this.logger.log(`문서 삭제 완료: ${documentId}`);
                return { deleted: true, documentId };
            },
            externalQueryRunner,
        );
    }

    // ============================================
    // 📋 문서 기안 작업
    // ============================================

    /**
     * 문서 기안 (상신)
     *
     * 임시저장된 문서를 기안합니다.
     * 문서 번호는 기안 시 생성되며, 양식은 "템플릿코드-연도-기안문서순번"으로 구성
     * 참고: 정책 검증은 Business Service에서 수행됨 (DocumentPolicyValidator)
     */
    async submitDocument(dto: SubmitDocumentDto, queryRunner?: QueryRunner) {
        this.logger.log(`문서 기안 시작: ${dto.documentId}`);

        // 1) 문서 조회
        const document = await this.documentService.findOneWithError({
            where: { id: dto.documentId },
            queryRunner,
        });

        // 2) 결재선 검증 및 스냅샷 생성/업데이트
        await this.validateAndProcessApprovalSteps(dto.documentId, dto.approvalSteps, queryRunner);

        // 4) 템플릿 ID 확인 (기안 시점에 전달받은 값 사용, 없으면 문서의 기존 값 사용)
        const documentTemplateId = dto.documentTemplateId || document.documentTemplateId || null;

        // 템플릿 확인 (있는 경우)
        if (documentTemplateId) {
            await this.documentTemplateService.findOneWithError({
                where: { id: documentTemplateId },
                queryRunner,
            });
        }

        // 5) 문서 번호 생성 (템플릿코드-연도-기안문서순번)
        const documentNumber = await this.generateDocumentNumber(documentTemplateId, queryRunner);

        // 6) Document 기안 처리 (Domain Service 활용)
        const submittedDocument = await this.documentService.submitDocument(
            document,
            documentNumber,
            dto.metadata,
            documentTemplateId || undefined,
            queryRunner,
        );

        this.logger.log(`문서 기안 완료: ${dto.documentId}, 문서번호: ${documentNumber}`);
        return submittedDocument;
    }

    /**
     * 상신취소 (기안자용)
     *
     * 정책: 결재 진행 중(PENDING) 문서만 취소 가능, 기안자만 호출 가능.
     * 요청에 사유가 있으면 해당 값, 없으면 기본값 저장.
     */
    async 상신을취소한다(dto: CancelSubmitDto, queryRunner?: QueryRunner) {
        this.logger.log(`상신 취소 시작: ${dto.documentId}, 기안자: ${dto.drafterId}`);

        // 1) Document 조회
        const document = await this.documentService.findOneWithError({
            where: { id: dto.documentId },
            queryRunner,
        });

        // 2) 결재 진행 중 상태 확인
        if (document.status !== DocumentStatus.PENDING) {
            throw new BadRequestException('결재 진행 중인 문서만 상신취소할 수 있습니다.');
        }

        // 3) 기안자 확인
        if (document.drafterId !== dto.drafterId) {
            throw new ForbiddenException('기안자만 상신취소할 수 있습니다.');
        }

        const reason = (dto.reason?.trim() ?? '') || '상신 취소';

        // 4) Document 상태를 CANCELLED로 변경
        document.취소한다(reason);
        await this.documentService.save(document, { queryRunner });

        // 기안자가 결재 취소 시 코멘트가 중복생성되기 떄문에 주석처리
        // // 5) 취소 사유를 Comment로 저장
        // await this.commentService.createComment(
        //     {
        //         documentId: document.id,
        //         authorId: dto.drafterId,
        //         content: reason,
        //     },
        //     queryRunner,
        // );

        this.logger.log(`상신 취소 완료: ${dto.documentId}, 기안자: ${dto.drafterId}`);
        return document;
    }

    // ============================================
    // 🛠️ Private 헬퍼 메서드
    // ============================================

    /**
     * 문서 수정 이력을 포함한 메타데이터 생성
     */
    private buildUpdatedMetadata(document: Document, dto: UpdateDocumentDto): Record<string, any> {
        // 기존 수정 이력 배열 가져오기 (없으면 빈 배열)
        const existingHistory = (document.metadata?.modificationHistory as DocumentModificationHistoryItem[]) || [];

        // 새로운 수정 이력 항목 생성
        const newHistoryItem: DocumentModificationHistoryItem = {
            previousTitle: document.title,
            previousContent: document.content,
            modifiedAt: new Date().toISOString(),
            modificationComment: dto.comment || '수정 사유 없음',
            documentStatus: document.status,
        };

        // 기존 메타데이터 유지하면서 수정 이력 배열에 추가
        return {
            ...(document.metadata || {}),
            modificationHistory: [...existingHistory, newHistoryItem],
        };
    }

    /**
     * 문서 번호 생성 헬퍼
     * 형식: {템플릿코드}-{연도}-{순번}
     * 예: VAC-2025-0001, EXT-2025-0001 (템플릿 없는 경우)
     */
    private async generateDocumentNumber(documentTemplateId: string | null, queryRunner: QueryRunner): Promise<string> {
        let templateCode = 'EXT'; // 기본값: 외부 문서

        // 템플릿이 있는 경우 템플릿 코드 사용
        if (documentTemplateId) {
            const documentTemplate = await this.documentTemplateService.findOne({
                where: { id: documentTemplateId },
                queryRunner,
            });

            if (documentTemplate) {
                templateCode = documentTemplate.code;
            }
        }

        // 현재 연도
        const currentYear = new Date().getFullYear().toString();

        // 해당 템플릿의 같은 연도 기안 문서 수 조회 (문서 번호가 있는 문서만)
        const yearStart = `${currentYear}-01-01`;
        const nextYearStart = `${parseInt(currentYear) + 1}-01-01`;

        const countResult = await queryRunner.query(
            `SELECT COUNT(*) as count FROM documents 
             WHERE "documentNumber" LIKE $1 
             AND "submittedAt" >= $2 
             AND "submittedAt" < $3
             AND "documentNumber" IS NOT NULL`,
            [`${templateCode}-${currentYear}-%`, yearStart, nextYearStart],
        );

        const seq = parseInt(countResult[0]?.count || '0') + 1;
        const seqStr = seq.toString().padStart(4, '0');

        return `${templateCode}-${currentYear}-${seqStr}`;
    }

    // ============================================
    // 🔧 결재선 관리 (Business Service에서 사용)
    // ============================================

    /**
     * 결재단계 스냅샷 생성
     */
    async createApprovalStepSnapshots(
        documentId: string,
        approvalSteps: CreateDocumentDto['approvalSteps'],
        queryRunner: QueryRunner,
    ) {
        if (!approvalSteps || approvalSteps.length === 0) return;

        for (const step of approvalSteps) {
            // approverId를 기반으로 스냅샷 메타데이터 자동 생성
            const approverSnapshot = await this.buildApproverSnapshot(step.approverId, queryRunner);

            // 도메인 서비스를 통해 생성
            await this.approvalStepSnapshotService.createApprovalStepSnapshot(
                {
                    documentId,
                    stepOrder: step.stepOrder,
                    stepType: step.stepType,
                    approverId: step.approverId,
                    approverSnapshot,
                },
                queryRunner,
            );
        }

        this.logger.debug(`결재단계 스냅샷 ${approvalSteps.length}개 생성 완료: 문서 ${documentId}`);
    }

    /**
     * 결재단계 스냅샷 수정 (생성/수정/삭제)
     */
    async updateApprovalStepSnapshots(
        documentId: string,
        approvalSteps: UpdateDocumentDto['approvalSteps'],
        queryRunner: QueryRunner,
    ) {
        if (approvalSteps === undefined) return;

        // 기존 스냅샷 조회
        const existingSnapshots = await this.approvalStepSnapshotService.findAll({
            where: { documentId },
            queryRunner,
        });

        const existingSnapshotIds = new Set(existingSnapshots.map((s) => s.id));
        const requestedSnapshotIds = new Set(approvalSteps.filter((step) => step.id).map((step) => step.id!));

        // 삭제할 스냅샷들 (기존에 있지만 요청에 없는 것)
        const snapshotsToDelete = existingSnapshots.filter((s) => !requestedSnapshotIds.has(s.id));
        for (const snapshot of snapshotsToDelete) {
            await this.approvalStepSnapshotService.delete(snapshot.id, { queryRunner });
        }

        // 수정 및 생성
        for (const step of approvalSteps) {
            // approverId를 기반으로 스냅샷 메타데이터 자동 생성
            const approverSnapshot = await this.buildApproverSnapshot(step.approverId, queryRunner);

            if (step.id && existingSnapshotIds.has(step.id)) {
                // 기존 스냅샷 조회 및 수정 (status는 변경하지 않음 - 결재 프로세스에서 관리)
                const existingSnapshot = existingSnapshots.find((s) => s.id === step.id);
                if (existingSnapshot) {
                    await this.approvalStepSnapshotService.updateApprovalStepSnapshot(
                        existingSnapshot,
                        {
                            stepOrder: step.stepOrder,
                            stepType: step.stepType,
                            approverId: step.approverId,
                            approverSnapshot,
                        },
                        queryRunner,
                    );
                }
            } else {
                // 새 스냅샷 생성 (도메인 서비스 사용)
                await this.approvalStepSnapshotService.createApprovalStepSnapshot(
                    {
                        documentId,
                        stepOrder: step.stepOrder,
                        stepType: step.stepType,
                        approverId: step.approverId,
                        approverSnapshot,
                    },
                    queryRunner,
                );
            }
        }

        this.logger.debug(
            `결재단계 스냅샷 업데이트 완료: 문서 ${documentId}, ${approvalSteps.length}개 처리, ${snapshotsToDelete.length}개 삭제`,
        );
    }

    /**
     * 결재선 검증 및 스냅샷 생성/업데이트 처리
     * @param documentId 문서 ID
     * @param approvalSteps 결재선 정보 (선택)
     * @param queryRunner Query Runner
     */
    async validateAndProcessApprovalSteps(
        documentId: string,
        approvalSteps?: UpdateDocumentDto['approvalSteps'],
        queryRunner?: QueryRunner,
    ): Promise<void> {
        // 결재선 정보가 제공된 경우
        if (approvalSteps && approvalSteps.length > 0) {
            // 1) 결재선 타입 검증: 결재 하나와 시행 하나는 필수
            const approvalTypeSteps = approvalSteps.filter((step) => step.stepType === ApprovalStepType.APPROVAL);
            const implementationTypeSteps = approvalSteps.filter(
                (step) => step.stepType === ApprovalStepType.IMPLEMENTATION,
            );

            if (approvalTypeSteps.length < 1 || implementationTypeSteps.length < 1) {
                throw new BadRequestException('결재 하나와 시행 하나는 필수로 필요합니다.');
            }

            // 2) 결재단계 스냅샷 생성/업데이트
            await this.updateApprovalStepSnapshots(documentId, approvalSteps, queryRunner!);
        } else {
            // 결재선 정보가 제공되지 않은 경우: 기존 스냅샷 확인
            const existingSnapshots = await this.approvalStepSnapshotService.findAll({
                where: { documentId },
                queryRunner,
            });

            if (existingSnapshots.length === 0) {
                throw new BadRequestException('기안 시 결재선이 필요합니다.');
            }

            // 기존 스냅샷의 타입 검증
            const approvalTypeSteps = existingSnapshots.filter((step) => step.stepType === ApprovalStepType.APPROVAL);
            const implementationTypeSteps = existingSnapshots.filter(
                (step) => step.stepType === ApprovalStepType.IMPLEMENTATION,
            );

            if (approvalTypeSteps.length < 1 || implementationTypeSteps.length < 1) {
                throw new BadRequestException('기존 결재선에 결재 하나와 시행 하나는 필수로 필요합니다.');
            }
        }
    }

    /**
     * 결재자 스냅샷 메타데이터 자동 생성
     * approverId를 기반으로 직원의 현재 부서, 직책, 직급 정보를 조회하여 스냅샷 생성
     */
    private async buildApproverSnapshot(
        approverId: string,
        queryRunner: QueryRunner,
    ): Promise<ApproverSnapshotMetadata> {
        // 직원 정보 조회 (부서, 직책, 직급 포함)
        const employee = await this.employeeService.findOne({
            where: { id: approverId },
            relations: [
                'departmentPositions',
                'departmentPositions.department',
                'departmentPositions.position',
                'currentRank',
            ],
            queryRunner,
        });

        if (!employee) {
            throw new NotFoundException(`결재자를 찾을 수 없습니다: ${approverId}`);
        }

        // 현재 부서 및 직책 정보 (isManager가 true이거나 첫 번째 것)
        const currentDepartmentPosition =
            employee.departmentPositions?.find((dp) => dp.isManager) || employee.departmentPositions?.[0];

        const snapshot: ApproverSnapshotMetadata = {
            employeeName: employee.name,
            employeeNumber: employee.employeeNumber,
        };

        // 부서 정보
        if (currentDepartmentPosition?.department) {
            snapshot.departmentId = currentDepartmentPosition.department.id;
            snapshot.departmentName = currentDepartmentPosition.department.departmentName;
        }

        // 직책 정보
        if (currentDepartmentPosition?.position) {
            snapshot.positionId = currentDepartmentPosition.position.id;
            snapshot.positionTitle = currentDepartmentPosition.position.positionTitle;
        }

        // 직급 정보
        if (employee.currentRank) {
            snapshot.rankId = employee.currentRank.id;
            snapshot.rankTitle = employee.currentRank.rankTitle;
        }

        return snapshot;
    }
}
