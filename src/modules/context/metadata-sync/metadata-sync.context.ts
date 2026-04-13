import { Injectable, Logger } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { DepartmentType } from '../../../common/enums/department.enum';
import { EmployeeStatus, Gender } from '../../../common/enums/employee.enum';
import { DomainPositionService } from '../../domain/position/position.service';
import { DomainRankService } from '../../domain/rank/rank.service';
import { DomainDepartmentService } from '../../domain/department/department.service';
import { DomainEmployeeService } from '../../domain/employee/employee.service';
import { DomainEmployeeDepartmentPositionService } from '../../domain/employee-department-position/employee-department-position.service';
import type {
    MetadataSyncAllInput,
    MetadataSyncDepartmentInput,
    MetadataSyncEmployeeDepartmentPositionInput,
    MetadataSyncEmployeeInput,
    MetadataSyncPositionInput,
    MetadataSyncRankInput,
} from './metadata-sync.types';

/**
 * MetadataSyncContext
 * 메타데이터(조직, 직원 정보) 동기화를 위한 컨텍스트
 * 여러 도메인 서비스를 조합하여 메타데이터 동기화 로직을 구현합니다.
 */
@Injectable()
export class MetadataSyncContext {
    private readonly logger = new Logger(MetadataSyncContext.name);

    /** 동기화 시 실제 order와 겹치지 않는 임시 order 구간 (UQ 충돌 회피) */
    private readonly departmentOrderTempBase = 9_000_000;

    /** `parentDepartmentId === null` 인 루트 부서 그룹을 Set 키로 쓰기 위한 값 */
    private readonly departmentRootParentKey = '__ROOT__';

    constructor(
        private readonly positionService: DomainPositionService,
        private readonly rankService: DomainRankService,
        private readonly departmentService: DomainDepartmentService,
        private readonly employeeService: DomainEmployeeService,
        private readonly employeeDepartmentPositionService: DomainEmployeeDepartmentPositionService,
    ) {}

    /** 동기화 페이로드의 isCurrent(또는 동일 의미 필드)를 boolean으로 해석한다. 미전달 시 기존값 또는 true */
    private 동기화페이로드에서IsCurrent해석한다(payload: unknown, 기존값: boolean | undefined): boolean {
        if (payload === true) return true;
        if (payload === false) return false;
        return 기존값 ?? true;
    }

    /**
     * 직책(Position) 동기화
     */
    async syncPositions(positions: MetadataSyncPositionInput[]): Promise<void> {
        this.logger.log(`Position 동기화 시작 (${positions.length}개)`);

        for (const position of positions) {
            try {
                const existing = await this.positionService.findOne({ where: { id: position.id } });

                if (existing) {
                    // 업데이트
                    existing.positionTitle = position.positionTitle;
                    existing.positionCode = position.positionCode;
                    existing.level = position.level;
                    existing.hasManagementAuthority = position.hasManagementAuthority;
                    await this.positionService.save(existing);
                    this.logger.debug(`Position 업데이트: ${position.positionTitle}`);
                } else {
                    // 생성
                    const newPosition = await this.positionService.create({
                        id: position.id,
                        positionTitle: position.positionTitle,
                        positionCode: position.positionCode,
                        level: position.level,
                        hasManagementAuthority: position.hasManagementAuthority,
                    });
                    await this.positionService.save(newPosition);
                    this.logger.debug(`Position 생성: ${position.positionTitle}`);
                }
            } catch (error) {
                this.logger.error(`Position 동기화 실패: ${position.positionTitle}`, error);
                throw error;
            }
        }

        this.logger.log('Position 동기화 완료');
    }

    /**
     * 직급(Rank) 동기화
     */
    async syncRanks(ranks: MetadataSyncRankInput[]): Promise<void> {
        this.logger.log(`Rank 동기화 시작 (${ranks.length}개)`);

        for (const rank of ranks) {
            try {
                const existing = await this.rankService.findOne({ where: { id: rank.id } });

                if (existing) {
                    // 업데이트
                    existing.rankTitle = rank.rankName;
                    existing.rankCode = rank.rankCode;
                    existing.level = rank.level;
                    await this.rankService.save(existing);
                    this.logger.debug(`Rank 업데이트: ${rank.rankName}`);
                } else {
                    // 생성
                    const newRank = await this.rankService.create({
                        id: rank.id,
                        rankTitle: rank.rankName,
                        rankCode: rank.rankCode,
                        level: rank.level,
                    });
                    await this.rankService.save(newRank);
                    this.logger.debug(`Rank 생성: ${rank.rankName}`);
                }
            } catch (error) {
                this.logger.error(`Rank 동기화 실패: ${rank.rankName}`, error);
                throw error;
            }
        }

        this.logger.log('Rank 동기화 완료');
    }

    /**
     * 동일 부모 아래 (parentDepartmentId, order) 유니크 제약 때문에,
     * 순서/부모 변경 시 중간 상태에서 duplicate key가 날 수 있다.
     * 해당 부모(및 이전 부모)에 속한 모든 행의 order를 임시 고유값으로 옮긴다.
     */
    private async 부모별부서Order충돌회피용임시할당한다(parentKeys: Set<string>): Promise<void> {
        for (const key of parentKeys) {
            const where =
                key === this.departmentRootParentKey
                    ? { parentDepartmentId: IsNull() }
                    : { parentDepartmentId: key };

            const siblings = await this.departmentService.findAll({ where });
            siblings.sort((a, b) => a.id.localeCompare(b.id));
            for (let i = 0; i < siblings.length; i++) {
                const row = siblings[i];
                row.order = this.departmentOrderTempBase + i;
                await this.departmentService.save(row);
            }
        }
    }

    /**
     * 부서(Department) 동기화
     * 부모-자식 관계가 있으므로 순서대로 처리
     */
    async syncDepartments(departments: MetadataSyncDepartmentInput[]): Promise<void> {
        this.logger.log(`Department 동기화 시작 (${departments.length}개)`);

        // 부모-자식 관계를 고려하여 배치 처리
        const processedIds = new Set<string>();
        let remainingDepartments = [...departments];
        let previousRemainingCount = remainingDepartments.length;

        // 모든 부서가 처리될 때까지 반복
        while (remainingDepartments.length > 0) {
            const currentBatch: MetadataSyncDepartmentInput[] = [];

            // 부모가 없거나, 부모가 이미 처리된 부서들을 현재 배치에 추가
            for (const department of remainingDepartments) {
                const canProcess =
                    !department.parentDepartmentId || // 루트 부서
                    processedIds.has(department.parentDepartmentId) || // 부모가 이미 처리됨
                    (await this.departmentService.findOne({ where: { id: department.parentDepartmentId } })); // 부모가 DB에 이미 존재

                if (canProcess) {
                    currentBatch.push(department);
                }
            }

            // 현재 배치가 비어있으면 순환 참조 또는 존재하지 않는 부모 부서
            if (currentBatch.length === 0 && remainingDepartments.length > 0) {
                this.logger.error(
                    `처리 불가능한 부서: ${remainingDepartments.map((d) => `${d.departmentName}(부모: ${d.parentDepartmentId})`).join(', ')}`,
                );
                throw new Error(
                    `부서 동기화 실패: 순환 참조 또는 존재하지 않는 부모 부서 (${remainingDepartments.length}개 부서 미처리)`,
                );
            }

            const 부모키수집한다 = new Set<string>();
            const 배치내기존부서조회한다 = new Map<string, Awaited<ReturnType<DomainDepartmentService['findOne']>>>();
            for (const department of currentBatch) {
                const existingRow = await this.departmentService.findOne({ where: { id: department.id } });
                배치내기존부서조회한다.set(department.id, existingRow);
                부모키수집한다.add(department.parentDepartmentId ?? this.departmentRootParentKey);
                if (existingRow) {
                    부모키수집한다.add(
                        existingRow.parentDepartmentId ?? this.departmentRootParentKey,
                    );
                }
            }
            await this.부모별부서Order충돌회피용임시할당한다(부모키수집한다);

            // 현재 배치 처리
            for (const department of currentBatch) {
                try {
                    const existing = 배치내기존부서조회한다.get(department.id) ?? null;

                    if (existing) {
                        // 업데이트
                        existing.departmentName = department.departmentName;
                        existing.departmentCode = department.departmentCode;
                        existing.type = department.type as DepartmentType;
                        existing.parentDepartmentId = department.parentDepartmentId ?? undefined;
                        existing.order = department.order;
                        existing.isCurrent = this.동기화페이로드에서IsCurrent해석한다(
                            department.isCurrent,
                            existing.isCurrent,
                        );
                        await this.departmentService.save(existing);
                        this.logger.debug(`Department 업데이트: ${department.departmentName}`);
                    } else {
                        // 생성
                        const newDepartment = await this.departmentService.create({
                            id: department.id,
                            departmentName: department.departmentName,
                            departmentCode: department.departmentCode,
                            type: department.type as DepartmentType,
                            parentDepartmentId: department.parentDepartmentId ?? undefined,
                            order: department.order,
                            isCurrent: this.동기화페이로드에서IsCurrent해석한다(department.isCurrent, undefined),
                        });
                        await this.departmentService.save(newDepartment);
                        this.logger.debug(`Department 생성: ${department.departmentName}`);
                    }

                    processedIds.add(department.id);
                } catch (error) {
                    this.logger.error(`Department 동기화 실패: ${department.departmentName}`, error);
                    throw error;
                }
            }

            // 처리된 부서들을 제거
            remainingDepartments = remainingDepartments.filter((d) => !processedIds.has(d.id));

            // 무한 루프 방지
            previousRemainingCount = remainingDepartments.length;
        }

        this.logger.log('Department 동기화 완료');
    }

    /**
     * 직원(Employee) 동기화
     */
    async syncEmployees(employees: MetadataSyncEmployeeInput[]): Promise<void> {
        this.logger.log(`Employee 동기화 시작 (${employees.length}개)`);

        for (const employee of employees) {
            try {
                const existing = await this.employeeService.findOne({ where: { id: employee.id } });
                if (existing) {
                    // 업데이트
                    existing.employeeNumber = employee.employeeNumber;
                    existing.name = employee.name;
                    existing.email = employee.email;
                    existing.password = employee.password ?? undefined;
                    existing.phoneNumber = employee.phoneNumber;
                    existing.dateOfBirth = employee.dateOfBirth
                        ? new Date(employee.dateOfBirth)
                        : undefined;
                    existing.gender = employee.gender as Gender | undefined;
                    existing.hireDate = new Date(employee.hireDate);
                    existing.status = employee.status as EmployeeStatus;
                    existing.currentRankId = employee.currentRankId;
                    existing.terminationDate = employee.terminationDate
                        ? new Date(employee.terminationDate)
                        : undefined;
                    existing.terminationReason = employee.terminationReason;
                    existing.isInitialPasswordSet = employee.isInitialPasswordSet;
                    await this.employeeService.save(existing);
                    this.logger.debug(`Employee 업데이트: ${employee.name} (${employee.employeeNumber})`);
                } else {
                    // 생성

                    const newEmployee = await this.employeeService.create({
                        id: employee.id,
                        employeeNumber: employee.employeeNumber,
                        name: employee.name,
                        email: employee.email,
                        password: employee.password ?? undefined,
                        phoneNumber: employee.phoneNumber,
                        dateOfBirth: employee.dateOfBirth
                            ? new Date(employee.dateOfBirth)
                            : undefined,
                        gender: employee.gender as Gender | undefined,
                        hireDate: new Date(employee.hireDate),
                        status: employee.status as EmployeeStatus,
                        currentRankId: employee.currentRankId,
                        terminationDate: employee.terminationDate
                            ? new Date(employee.terminationDate)
                            : undefined,
                        terminationReason: employee.terminationReason,
                        isInitialPasswordSet: employee.isInitialPasswordSet,
                        roles: employee.roles || [],
                    });
                    await this.employeeService.save(newEmployee);
                    this.logger.debug(`Employee 생성: ${employee.name} (${employee.employeeNumber})`);
                }
            } catch (error) {
                this.logger.error(`Employee 동기화 실패: ${employee.name} (${employee.employeeNumber})`, error);
                throw error;
            }
        }

        this.logger.log('Employee 동기화 완료');
    }

    /**
     * 직원-부서-직책(EmployeeDepartmentPosition) 동기화
     */
    async syncEmployeeDepartmentPositions(
        employeeDepartmentPositions: MetadataSyncEmployeeDepartmentPositionInput[],
    ): Promise<void> {
        this.logger.log(`EmployeeDepartmentPosition 동기화 시작 (${employeeDepartmentPositions.length}개)`);

        for (const edp of employeeDepartmentPositions) {
            try {
                const existing = await this.employeeDepartmentPositionService.findOne({ where: { id: edp.id } });

                if (existing) {
                    // 업데이트
                    existing.employeeId = edp.employeeId;
                    existing.departmentId = edp.departmentId;
                    existing.positionId = edp.positionId;
                    existing.isManager = edp.isManager;
                    existing.isCurrent = this.동기화페이로드에서IsCurrent해석한다(edp.isCurrent, existing.isCurrent);
                    await this.employeeDepartmentPositionService.save(existing);
                    this.logger.debug(`EmployeeDepartmentPosition 업데이트: ${edp.id}`);
                } else {
                    // 생성
                    const newEdp = await this.employeeDepartmentPositionService.create({
                        id: edp.id,
                        employeeId: edp.employeeId,
                        departmentId: edp.departmentId,
                        positionId: edp.positionId,
                        isManager: edp.isManager,
                        isCurrent: this.동기화페이로드에서IsCurrent해석한다(edp.isCurrent, undefined),
                    });
                    await this.employeeDepartmentPositionService.save(newEdp);
                    this.logger.debug(`EmployeeDepartmentPosition 생성: ${edp.id}`);
                }
            } catch (error) {
                this.logger.error(`EmployeeDepartmentPosition 동기화 실패: ${edp.id}`, error);
                continue;
            }
        }

        this.logger.log('EmployeeDepartmentPosition 동기화 완료');
    }

    /**
     * Department 재귀적 삭제 (자식부터 삭제)
     */
    private async deleteDepartmentsRecursively(): Promise<void> {
        const allDepartments = await this.departmentService.findAll();

        if (allDepartments.length === 0) {
            return;
        }

        // 자식이 없는 리프 노드부터 삭제
        const departmentIds = new Set(allDepartments.map((d) => d.id));
        let deletedCount = 0;

        while (departmentIds.size > 0) {
            const currentBatch: string[] = [];

            // 현재 남은 부서 중에서 자식이 없는 부서들을 찾음
            for (const department of allDepartments) {
                if (!departmentIds.has(department.id)) {
                    continue; // 이미 삭제된 부서
                }

                // 이 부서를 부모로 가진 부서가 남아있는지 확인
                const hasChildren = allDepartments.some(
                    (d) => departmentIds.has(d.id) && d.parentDepartmentId === department.id,
                );

                if (!hasChildren) {
                    currentBatch.push(department.id);
                }
            }

            // 삭제할 부서가 없으면 순환 참조
            if (currentBatch.length === 0) {
                this.logger.error(
                    `순환 참조 감지: ${Array.from(departmentIds)
                        .map((id) => {
                            const dept = allDepartments.find((d) => d.id === id);
                            return `${dept?.departmentName}(부모: ${dept?.parentDepartmentId})`;
                        })
                        .join(', ')}`,
                );
                throw new Error('Department 삭제 실패: 순환 참조 감지');
            }

            // 현재 배치 삭제
            for (const departmentId of currentBatch) {
                await this.departmentService.delete(departmentId);
                departmentIds.delete(departmentId);
                deletedCount++;
            }

            this.logger.debug(`Department ${currentBatch.length}개 삭제 (총 ${deletedCount}/${allDepartments.length})`);
        }
    }

    /**
     * 모든 메타데이터 삭제 (외래키 순서 고려)
     */
    async clearAllMetadata(): Promise<void> {
        this.logger.log('전체 메타데이터 삭제 시작');

        try {
            // 1. EmployeeDepartmentPosition 삭제 (Employee, Department, Position 참조)
            const edpResult = await this.employeeDepartmentPositionService.createQueryBuilder('edp').delete().execute();
            this.logger.log(`EmployeeDepartmentPosition 삭제 완료 (${edpResult.affected || 0}개)`);

            // 2. Employee 삭제 (Rank 참조)
            const employeeResult = await this.employeeService.createQueryBuilder('employee').delete().execute();
            this.logger.log(`Employee 삭제 완료 (${employeeResult.affected || 0}개)`);

            // 3. Department 삭제 (자기 참조가 있으므로 자식부터 삭제)
            await this.deleteDepartmentsRecursively();
            this.logger.log('Department 삭제 완료');

            // 4. Rank 삭제
            const rankResult = await this.rankService.createQueryBuilder('rank').delete().execute();
            this.logger.log(`Rank 삭제 완료 (${rankResult.affected || 0}개)`);

            // 5. Position 삭제
            const positionResult = await this.positionService.createQueryBuilder('position').delete().execute();
            this.logger.log(`Position 삭제 완료 (${positionResult.affected || 0}개)`);

            this.logger.log('전체 메타데이터 삭제 완료');
        } catch (error) {
            this.logger.error('전체 메타데이터 삭제 실패', error);
            throw error;
        }
    }

    /**
     * 모든 메타데이터 동기화 (순서 보장)
     */
    async syncAllMetadata(data: MetadataSyncAllInput): Promise<void> {
        this.logger.log('전체 메타데이터 동기화 시작');

        try {
            // await this.clearAllMetadata();
            // 1. Position 동기화 (다른 엔티티에서 참조하지 않음)
            await this.syncPositions(data.positions);

            // 2. Rank 동기화 (다른 엔티티에서 참조하지 않음)
            await this.syncRanks(data.ranks);

            // 3. Department 동기화
            await this.syncDepartments(data.departments);

            // 4. Employee 동기화 (Rank 참조)
            await this.syncEmployees(data.employees);

            // 5. EmployeeDepartmentPosition 동기화 (Employee, Department, Position 참조)
            await this.syncEmployeeDepartmentPositions(data.employeeDepartmentPositions);

            this.logger.log('전체 메타데이터 동기화 완료');
        } catch (error) {
            this.logger.error('전체 메타데이터 동기화 실패', error);
            throw error;
        }
    }
}
