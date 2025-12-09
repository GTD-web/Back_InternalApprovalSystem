import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { ApprovalStepType, ApprovalStatus } from '../../../common/enums/approval.enum';
import { Employee } from '../employee/employee.entity';
import { Document } from '../document/document.entity';

/**
 * 결재자 스냅샷 메타데이터 타입
 * 문서 기안 시점의 결재자 정보를 보존합니다.
 */
export interface ApproverSnapshotMetadata {
    departmentId?: string;
    departmentName?: string;
    positionId?: string;
    positionTitle?: string;
    rankId?: string;
    rankTitle?: string;
    employeeName?: string;
    employeeNumber?: string;
}

/**
 * ApprovalStepSnapshot 엔티티
 * 결재선 스냅샷의 각 결재 단계를 나타냅니다.
 * 문서 기안 시점에 생성되며, 실제 결재 진행 상태를 추적합니다.
 * 결재자의 부서/직책/직급 정보는 JSONB 메타데이터로 저장하여 불변성을 보장합니다.
 */
@Entity('approval_step_snapshots')
@Index(['documentId', 'stepOrder'])
@Index(['approverId'])
@Index(['status'])
export class ApprovalStepSnapshot {
    @PrimaryGeneratedColumn('uuid', { comment: '결재 단계 스냅샷 ID' })
    id: string;

    @Column({ type: 'uuid', comment: '문서 ID' })
    documentId: string;

    @Column({ type: 'int', comment: '결재 단계 순서' })
    stepOrder: number;

    @Column({
        type: 'enum',
        enum: ApprovalStepType,
        comment: '결재 단계 타입',
    })
    stepType: ApprovalStepType;

    @Column({ type: 'uuid', comment: '결재자 ID' })
    approverId: string;

    @Column({
        type: 'jsonb',
        nullable: true,
        comment: '결재자 스냅샷 시점 정보 (부서, 직책, 직급 등)',
    })
    approverSnapshot?: ApproverSnapshotMetadata;

    @Column({
        type: 'enum',
        enum: ApprovalStatus,
        default: ApprovalStatus.PENDING,
        comment: '결재 상태',
    })
    status: ApprovalStatus;

    @Column({ type: 'text', nullable: true, comment: '결재 의견' })
    comment?: string;

    @Column({ type: 'timestamp', nullable: true, comment: '결재 완료 시간' })
    approvedAt?: Date;

    @CreateDateColumn({ comment: '생성일' })
    createdAt: Date;

    @UpdateDateColumn({ comment: '수정일' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Document, (document) => document.approvalSteps, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'documentId' })
    document: Document;

    @ManyToOne(() => Employee)
    @JoinColumn({ name: 'approverId' })
    approver: Employee;

    // Setter 메서드들
    문서를설정한다(documentId: string): void {
        this.documentId = documentId;
    }

    결재단계순서를설정한다(stepOrder: number): void {
        this.stepOrder = stepOrder;
    }

    결재단계타입을설정한다(stepType: ApprovalStepType): void {
        this.stepType = stepType;
    }

    결재자를설정한다(approverId: string): void {
        this.approverId = approverId;
    }

    결재자스냅샷을설정한다(approverSnapshot: ApproverSnapshotMetadata): void {
        this.approverSnapshot = approverSnapshot;
    }

    의견을설정한다(comment: string): void {
        this.comment = comment;
    }

    // 상태 관련 메서드들
    승인한다(): void {
        this.status = ApprovalStatus.APPROVED;
        this.approvedAt = new Date();
    }

    반려한다(): void {
        this.status = ApprovalStatus.REJECTED;
        this.approvedAt = new Date();
    }

    대기한다(): void {
        this.status = ApprovalStatus.PENDING;
        this.approvedAt = null;
    }

    취소한다(): void {
        this.status = ApprovalStatus.CANCELLED;
        this.approvedAt = null;
    }
}
