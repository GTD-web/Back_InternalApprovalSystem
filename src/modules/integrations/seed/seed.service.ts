import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Document } from '../../domain/document/document.entity';
import {
    ApprovalStepSnapshot,
    ApproverSnapshotMetadata,
} from '../../domain/approval-step-snapshot/approval-step-snapshot.entity';
import { Comment } from '../../domain/comment/comment.entity';
import { DocumentRevision } from '../../domain/document-revision/document-revision.entity';
import { DocumentStatus, ApprovalStatus, ApprovalStepType } from '../../../common/enums/approval.enum';
import { DomainDocumentService } from '../../domain/document/document.service';
import { DomainApprovalStepSnapshotService } from '../../domain/approval-step-snapshot/approval-step-snapshot.service';
import { DomainCommentService } from '../../domain/comment/comment.service';
import { DomainEmployeeService } from '../../domain/employee/employee.service';

const WEB_PART_DEPARTMENT_NAME = 'Web파트';
const SEED_EMPLOYEES_REQUIRED = 20;

/** 결재선 앞쪽: 합의/결재만 랜덤 배치 (시행·수신참조 제외) */
const AGREEMENT_APPROVAL_TYPES = [ApprovalStepType.AGREEMENT, ApprovalStepType.APPROVAL] as const;

function shuffle<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/** buildApproverSnapshot에서 조회한 직원 형태 (relations 로드 후) */
interface EmployeeWithRelations {
    name: string;
    employeeNumber: string;
    departmentPositions?: Array<{
        isManager?: boolean;
        department?: { id: string; departmentName: string };
        position?: { id: string; positionTitle: string };
    }>;
    currentRank?: { id: string; rankTitle: string };
}

/** FK 순서대로 삭제 (자식 → 부모) */
const DELETE_ORDER: Array<{ entity: new () => any; name: string }> = [
    { entity: Comment, name: 'comments' },
    { entity: ApprovalStepSnapshot, name: 'approval_step_snapshots' },
    { entity: DocumentRevision, name: 'document_revisions' },
    { entity: Document, name: 'documents' },
];

@Injectable()
export class SeedService {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly documentService: DomainDocumentService,
        private readonly approvalStepSnapshotService: DomainApprovalStepSnapshotService,
        private readonly commentService: DomainCommentService,
        private readonly employeeService: DomainEmployeeService,
    ) {}

    /**
     * 플로우·결재함 쿼리 테스트용 데이터 전체 삭제 (메타데이터 제외)
     * 삭제: comments, approval_step_snapshots, document_revisions, documents (FK 순서)
     * 유지: employees, departments, positions, ranks, categories, document_templates, approval_step_templates, employee_department_positions
     */
    async deleteAllTransactionalData(queryRunner?: QueryRunner): Promise<{ deleted: Record<string, number> }> {
        const runner = queryRunner ?? this.dataSource.createQueryRunner();
        const deleted: Record<string, number> = {};

        try {
            if (!queryRunner) {
                await runner.connect();
                await runner.startTransaction();
            }

            for (const { entity, name } of DELETE_ORDER) {
                const result = await runner.manager.createQueryBuilder().delete().from(entity).execute();
                deleted[name] = result.affected ?? 0;
            }

            if (!queryRunner) {
                await runner.commitTransaction();
            }
            this.logger.log('Transactional data deleted (metadata preserved)', deleted);
            return { deleted };
        } catch (e) {
            if (!queryRunner) {
                await runner.rollbackTransaction();
            }
            throw e;
        } finally {
            if (!queryRunner) {
                await runner.release();
            }
        }
    }

    /**
     * 부서명이 'Web파트'인 부서의 부서원 ID 목록 조회 (최소 8명)
     * 기안·결재·시행·참조는 이 목록 안에서 직원별·문서별 무작위 배정에 사용
     */
    private async getWebPartEmployeeIds(): Promise<string[]> {
        const employees = await this.employeeService
            .createQueryBuilder('employee')
            .innerJoin('employee.departmentPositions', 'edp')
            .innerJoin('edp.department', 'd')
            .where('d.departmentName = :name', { name: WEB_PART_DEPARTMENT_NAME })
            .take(SEED_EMPLOYEES_REQUIRED)
            .getMany();

        return employees.map((e) => e.id);
    }

    /**
     * 결재선 생성: 1단계=기안자 결재·승인, 그 다음 합의/결재 랜덤 → 시행 → 수신참조 순으로만 배치
     */
    private buildRandomSteps(
        drafterId: string,
        ids: string[],
        numExtraSteps: number,
        docStatus: DocumentStatus,
    ): Array<{ stepOrder: number; stepType: ApprovalStepType; approverId: string; status: ApprovalStatus }> {
        const steps: Array<{
            stepOrder: number;
            stepType: ApprovalStepType;
            approverId: string;
            status: ApprovalStatus;
        }> = [
            {
                stepOrder: 1,
                stepType: ApprovalStepType.APPROVAL,
                approverId: drafterId,
                status: ApprovalStatus.APPROVED,
            },
        ];

        if (numExtraSteps === 0) return steps;

        // 합의/결재 개수(앞) → 시행 0~1 → 수신참조 나머지 (시행 뒤에만)
        const agreementApprovalCount = Math.max(1, numExtraSteps - 2);
        const implementationCount = Math.min(1, Math.max(0, numExtraSteps - agreementApprovalCount));
        const referenceCount = numExtraSteps - agreementApprovalCount - implementationCount;

        let order = 2;

        const resolveStatus = (stepOrder: number): ApprovalStatus => {
            if (docStatus === DocumentStatus.APPROVED || docStatus === DocumentStatus.IMPLEMENTED)
                return ApprovalStatus.APPROVED;
            if (docStatus === DocumentStatus.REJECTED && stepOrder === 2) return ApprovalStatus.REJECTED;
            return ApprovalStatus.PENDING;
        };

        // 1) 합의/결재: 타입만 셔플해서 순서 랜덤, 결재자는 ids에서 무작위
        const agreementApprovalTypes = shuffle([...AGREEMENT_APPROVAL_TYPES]);
        for (let i = 0; i < agreementApprovalCount; i++) {
            const stepType = agreementApprovalTypes[i % agreementApprovalTypes.length];
            steps.push({
                stepOrder: order,
                stepType,
                approverId: randomElement(ids),
                status: resolveStatus(order),
            });
            order++;
        }

        // 2) 시행: 합의/결재 뒤에만
        for (let i = 0; i < implementationCount; i++) {
            steps.push({
                stepOrder: order,
                stepType: ApprovalStepType.IMPLEMENTATION,
                approverId: randomElement(ids),
                status: resolveStatus(order),
            });
            order++;
        }

        // 3) 수신참조: 시행 뒤에만
        for (let i = 0; i < referenceCount; i++) {
            steps.push({
                stepOrder: order,
                stepType: ApprovalStepType.REFERENCE,
                approverId: randomElement(ids),
                status: resolveStatus(order),
            });
            order++;
        }

        return steps;
    }

    /**
     * 결재자 스냅샷 메타데이터 생성 (부서, 직책, 직급, 이름, 사번)
     */
    private async buildApproverSnapshot(approverId: string, runner?: QueryRunner): Promise<ApproverSnapshotMetadata> {
        const employee = await this.employeeService.findOne({
            where: { id: approverId },
            relations: [
                'departmentPositions',
                'departmentPositions.department',
                'departmentPositions.position',
                'currentRank',
            ],
            queryRunner: runner,
        });

        if (!employee) {
            return { employeeName: undefined, employeeNumber: undefined };
        }

        const emp = employee as EmployeeWithRelations;
        const currentDepartmentPosition =
            emp.departmentPositions?.find((dp) => dp.isManager) || emp.departmentPositions?.[0];

        const snapshot: ApproverSnapshotMetadata = {
            employeeName: emp.name,
            employeeNumber: emp.employeeNumber,
        };
        if (currentDepartmentPosition?.department) {
            snapshot.departmentId = currentDepartmentPosition.department.id;
            snapshot.departmentName = currentDepartmentPosition.department.departmentName;
        }
        if (currentDepartmentPosition?.position) {
            snapshot.positionId = currentDepartmentPosition.position.id;
            snapshot.positionTitle = currentDepartmentPosition.position.positionTitle;
        }
        if (emp.currentRank) {
            snapshot.rankId = emp.currentRank.id;
            snapshot.rankTitle = emp.currentRank.rankTitle;
        }
        return snapshot;
    }

    /**
     * 플로우·결재함 테스트용 시드 데이터 생성
     * Web파트 직원每人이 기안자인 문서를 생성하고, 결재·시행·참조는 동일 직원 풀에서 무작위 배정
     */
    async runSeed(options?: {
        templateId?: string;
    }): Promise<{ documents: string[]; message: string; employeeIds: string[] }> {
        const ids = await this.getWebPartEmployeeIds();
        const templateId = options?.templateId;
        const documentIds: string[] = [];
        const runner = this.dataSource.createQueryRunner();
        let docCounter = 0;
        const pad = (n: number) => String(n).padStart(2, '0');
        const docNum = () => {
            const d = new Date();
            const timePart = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
            return `SEED-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${timePart}-${String(++docCounter).padStart(4, '0')}`;
        };

        try {
            await runner.connect();
            await runner.startTransaction();

            const statusesForVariety: DocumentStatus[] = [
                DocumentStatus.PENDING,
                DocumentStatus.APPROVED,
                DocumentStatus.IMPLEMENTED,
                DocumentStatus.REJECTED,
                DocumentStatus.CANCELLED,
            ];

            for (const drafterId of ids) {
                // 직원당 임시저장 1건
                const draftDoc = await this.documentService.createDocument(
                    {
                        title: `[시드] 임시저장 (기안자 ${drafterId.slice(0, 8)})`,
                        content: '<p>임시저장함 테스트</p>',
                        drafterId,
                        documentTemplateId: templateId,
                    },
                    runner,
                );
                documentIds.push(draftDoc.id);

                // 직원당 상신 문서 3건: 결재단계 최소 1개(기안자) ~ 최대 5개
                const stepCount = () => Math.floor(Math.random() * 5); // 0~4 → 총 1~5단계

                const steps1 = this.buildRandomSteps(drafterId, ids, stepCount(), DocumentStatus.PENDING);
                const doc1 = await this.createSubmittedDocumentWithSteps(
                    drafterId,
                    `[시드] 결재진행 (기안자 ${drafterId.slice(0, 8)})`,
                    steps1,
                    docNum(),
                    templateId,
                    runner,
                    DocumentStatus.PENDING,
                );
                documentIds.push(doc1.id);

                const secondStatus = randomElement(statusesForVariety);
                const steps2 = this.buildRandomSteps(drafterId, ids, stepCount(), secondStatus);
                const doc2 = await this.createSubmittedDocumentWithSteps(
                    drafterId,
                    `[시드] ${secondStatus} (기안자 ${drafterId.slice(0, 8)})`,
                    steps2,
                    docNum(),
                    templateId,
                    runner,
                    secondStatus,
                );
                documentIds.push(doc2.id);

                const thirdStatus = randomElement(statusesForVariety);
                const steps3 = this.buildRandomSteps(drafterId, ids, stepCount(), thirdStatus);
                const doc3 = await this.createSubmittedDocumentWithSteps(
                    drafterId,
                    `[시드] ${thirdStatus} (기안자 ${drafterId.slice(0, 8)})`,
                    steps3,
                    docNum(),
                    templateId,
                    runner,
                    thirdStatus,
                );
                documentIds.push(doc3.id);
            }

            await runner.commitTransaction();
            this.logger.log(
                `Seed completed: ${documentIds.length} documents (Web파트 직원 ${ids.length}명, 직원당 기안 4건: 임시저장 1 + 상신 3)`,
            );
            return {
                documents: documentIds,
                employeeIds: ids,
                message: `Created ${documentIds.length} documents. Each Web파트 employee is drafter of 1 draft + 3 submitted docs; approval steps 1~5 per doc (step1=drafter approval).`,
            };
        } catch (e) {
            await runner.rollbackTransaction();
            this.logger.error('Seed failed', e);
            throw e;
        } finally {
            await runner.release();
        }
    }

    private async createSubmittedDocument(
        drafterId: string,
        title: string,
        steps: Array<{ stepOrder: number; stepType: ApprovalStepType; approverId: string }>,
        documentNumber: string,
        runner: QueryRunner,
        templateId?: string,
    ): Promise<Document> {
        const doc = await this.documentService.createDocument(
            { title, content: '<p>시드</p>', drafterId, documentTemplateId: templateId },
            runner,
        );
        doc.문서번호를설정한다(documentNumber);
        doc.상신한다();
        await this.documentService.save(doc, { queryRunner: runner });

        for (const s of steps) {
            const approverSnapshot = await this.buildApproverSnapshot(s.approverId, runner);
            const step = await this.approvalStepSnapshotService.createApprovalStepSnapshot(
                {
                    documentId: doc.id,
                    stepOrder: s.stepOrder,
                    stepType: s.stepType,
                    approverId: s.approverId,
                    approverSnapshot,
                },
                runner,
            );
        }
        return doc;
    }

    private async createSubmittedDocumentWithSteps(
        drafterId: string,
        title: string,
        steps: Array<{
            stepOrder: number;
            stepType: ApprovalStepType;
            approverId: string;
            status: ApprovalStatus;
        }>,
        documentNumber: string,
        templateId?: string,
        runner?: QueryRunner,
        docStatus: DocumentStatus = DocumentStatus.PENDING,
    ): Promise<Document> {
        const doc = await this.documentService.createDocument(
            { title, content: '<p>시드</p>', drafterId, documentTemplateId: templateId },
            runner,
        );
        doc.문서번호를설정한다(documentNumber);
        doc.상신한다();
        if (docStatus === DocumentStatus.APPROVED) doc.승인완료한다();
        else if (docStatus === DocumentStatus.REJECTED) doc.반려한다();
        else if (docStatus === DocumentStatus.CANCELLED) doc.취소한다('시드 취소');
        else if (docStatus === DocumentStatus.IMPLEMENTED) {
            doc.승인완료한다();
            doc.시행완료한다();
        }
        await this.documentService.save(doc, { queryRunner: runner });

        for (const s of steps) {
            const approverSnapshot = await this.buildApproverSnapshot(s.approverId, runner);
            const step = await this.approvalStepSnapshotService.createApprovalStepSnapshot(
                {
                    documentId: doc.id,
                    stepOrder: s.stepOrder,
                    stepType: s.stepType,
                    approverId: s.approverId,
                    approverSnapshot,
                },
                runner,
            );
            if (s.status === ApprovalStatus.APPROVED) step.승인한다();
            else if (s.status === ApprovalStatus.REJECTED) step.반려한다();
            await this.approvalStepSnapshotService.save(step, { queryRunner: runner });
        }
        return doc;
    }
}
