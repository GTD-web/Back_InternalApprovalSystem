import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { Employee } from '../employee/employee.entity';
import { Department } from '../department/department.entity';
import { Position } from '../position/position.entity';

export enum ManagerType {
    DIRECT = 'direct', // 직접 상사
    FUNCTIONAL = 'functional', // 기능적 상사
    PROJECT = 'project', // 프로젝트 리더
    TEMPORARY = 'temporary', // 임시 상사
    DEPUTY = 'deputy', // 대리 권한
}

@Entity('employee_department_positions')
@Unique(['employeeId', 'departmentId']) // 한 직원이 같은 부서에서는 하나의 직책만 가능
@Index(['employeeId'])
@Index(['departmentId'])
@Index(['positionId'])
export class EmployeeDepartmentPosition {
    @PrimaryColumn({ type: 'uuid', comment: '직원-부서-직책 ID (외부 제공)' })
    id: string;

    @Column({ comment: '직원 ID', type: 'uuid' })
    employeeId: string;

    @Column({ comment: '부서 ID', type: 'uuid' })
    departmentId: string;

    @Column({ comment: '직책 ID', type: 'uuid' })
    positionId: string;

    @Column({ comment: '관리자 권한 여부', type: 'boolean', default: false })
    isManager: boolean;

    @Column({ comment: '현재 유효(사용 중) 부서 배치 여부', type: 'boolean', default: true })
    isCurrent: boolean;

    @CreateDateColumn({ comment: '생성일' })
    createdAt: Date;

    @UpdateDateColumn({ comment: '수정일' })
    updatedAt: Date;

    // 관계 설정
    @ManyToOne(() => Employee, { eager: false })
    @JoinColumn({ name: 'employeeId' })
    employee: Employee;

    @ManyToOne(() => Department, { eager: false })
    @JoinColumn({ name: 'departmentId' })
    department: Department;

    @ManyToOne(() => Position, { eager: false })
    @JoinColumn({ name: 'positionId' })
    position: Position;
}
