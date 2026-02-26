import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { DocumentStatus } from '../../../common/enums/approval.enum';
import { Employee } from '../employee/employee.entity';
import { ApprovalStepSnapshot } from '../approval-step-snapshot/approval-step-snapshot.entity';
import { DocumentRevision } from '../document-revision/document-revision.entity';
import { Comment } from '../comment/comment.entity';

/**
 * Document 엔티티
 * 실제 기안된 문서를 나타냅니다.
 * 특정 FormVersion을 기반으로 생성되며, 기안 시점의 결재선 스냅샷을 보유합니다.
 */
@Entity('documents')
@Index(['drafterId'])
@Index(['status'])
@Index(['documentNumber'], { unique: true })
@Index(['createdAt'])
export class Document {
    @PrimaryGeneratedColumn('uuid', { comment: '문서 ID' })
    id: string;

    @Column({ type: 'varchar', length: 100, unique: true, nullable: true, comment: '문서(품의) 번호 (기안 시 생성)' })
    documentNumber?: string;

    @Column({ type: 'varchar', length: 500, comment: '문서 제목' })
    title: string;

    @Column({ type: 'text', comment: '문서 내용 (HTML)' })
    content: string;

    @Column({
        type: 'enum',
        enum: DocumentStatus,
        default: DocumentStatus.DRAFT,
        comment: '문서 상태',
    })
    status: DocumentStatus;

    @Column({ type: 'text', nullable: true, comment: '문서 비고' })
    comment?: string;

    @Column({ type: 'jsonb', nullable: true, comment: '문서 메타데이터 (추가 정보)' })
    metadata?: Record<string, any>;

    @Column({ type: 'uuid', comment: '기안자 ID' })
    drafterId: string;

    @Column({ type: 'uuid', nullable: true, comment: '문서 템플릿 ID' })
    documentTemplateId?: string;

    @Column({ type: 'varchar', length: 50, nullable: true, comment: '보존 연한 (예: 10년, 영구보관)' })
    retentionPeriod?: string;

    @Column({ type: 'varchar', length: 20, nullable: true, comment: '보존 연한 단위 (예: 년, 월, 일)' })
    retentionPeriodUnit?: string;

    @Column({ type: 'date', nullable: true, comment: '보존 연한 시작일' })
    retentionStartDate?: Date;

    @Column({ type: 'date', nullable: true, comment: '보존 연한 종료일' })
    retentionEndDate?: Date;

    @Column({ type: 'timestamp', nullable: true, comment: '기안(상신) 일시' })
    submittedAt?: Date;

    @Column({ type: 'text', nullable: true, comment: '취소 사유' })
    cancelReason?: string;

    @Column({ type: 'timestamp', nullable: true, comment: '취소 일시' })
    cancelledAt?: Date;

    @Column({ type: 'timestamp', nullable: true, comment: '결재 완료 일시' })
    approvedAt?: Date;

    @Column({ type: 'timestamp', nullable: true, comment: '반려 일시' })
    rejectedAt?: Date;

    @CreateDateColumn({ comment: '생성일' })
    createdAt: Date;

    @UpdateDateColumn({ comment: '수정일' })
    updatedAt: Date;

    @ManyToOne(() => Employee, (employee) => employee.draftDocuments)
    @JoinColumn({ name: 'drafterId' })
    drafter: Employee;

    @OneToMany(() => ApprovalStepSnapshot, (approvalStepSnapshot) => approvalStepSnapshot.document)
    approvalSteps: ApprovalStepSnapshot[];

    @OneToMany(() => DocumentRevision, (revision) => revision.document)
    revisions: DocumentRevision[];

    @OneToMany(() => Comment, (comment) => comment.document)
    comments: Comment[];

    // Setter 메서드들
    문서번호를설정한다(documentNumber: string): void {
        this.documentNumber = documentNumber;
    }

    제목을설정한다(title: string): void {
        this.title = title;
    }

    내용을설정한다(content: string): void {
        this.content = content;
    }

    비고를설정한다(comment: string): void {
        this.comment = comment;
    }

    메타데이터를설정한다(metadata: Record<string, any>): void {
        this.metadata = metadata;
    }

    기안자를설정한다(drafterId: string): void {
        this.drafterId = drafterId;
    }

    문서템플릿을설정한다(documentTemplateId: string): void {
        this.documentTemplateId = documentTemplateId;
    }

    보존연한을설정한다(retentionPeriod: string): void {
        this.retentionPeriod = retentionPeriod;
    }

    보존연한단위를설정한다(retentionPeriodUnit: string): void {
        this.retentionPeriodUnit = retentionPeriodUnit;
    }

    보존연한시작일을설정한다(retentionStartDate: Date): void {
        this.retentionStartDate = retentionStartDate;
    }

    보존연한종료일을설정한다(retentionEndDate: Date): void {
        this.retentionEndDate = retentionEndDate;
    }

    // 상태 관련 메서드들
    임시저장한다(): void {
        this.status = DocumentStatus.DRAFT;
    }

    상신한다(): void {
        this.status = DocumentStatus.PENDING;
        this.submittedAt = new Date();
    }

    승인완료한다(): void {
        this.status = DocumentStatus.APPROVED;
        this.approvedAt = new Date();
    }

    반려한다(): void {
        this.status = DocumentStatus.REJECTED;
        this.rejectedAt = new Date();
    }

    취소한다(reason?: string): void {
        this.status = DocumentStatus.CANCELLED;
        this.cancelReason = reason;
        this.cancelledAt = new Date();
    }

    /** 결재 완료 상태에서 한 결재자가 취소했을 때 문서를 다시 결재 진행 중으로 되돌린다 */
    결재진행중으로되돌린다(): void {
        this.status = DocumentStatus.PENDING;
        this.approvedAt = undefined;
    }

    시행완료한다(): void {
        this.status = DocumentStatus.IMPLEMENTED;
    }
}
