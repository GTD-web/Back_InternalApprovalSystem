import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DomainDepartmentService } from '../../domain/department/department.service';
import { DomainPositionService } from '../../domain/position/position.service';
import { DomainEmployeeService } from '../../domain/employee/employee.service';
import { DomainEmployeeDepartmentPositionService } from '../../domain/employee-department-position/employee-department-position.service';
import { EmployeeStatus } from '../../../common/enums/employee.enum';
import { SSOService } from '../../integrations/sso';
import { Not } from 'typeorm';

/**
 * 메타데이터 컨텍스트
 *
 * 조직 메타데이터(부서, 직급, 직원) 조회를 담당합니다.
 */
@Injectable()
export class MetadataContext {
    private readonly logger = new Logger(MetadataContext.name);

    constructor(
        private readonly departmentService: DomainDepartmentService,
        private readonly positionService: DomainPositionService,
        private readonly employeeService: DomainEmployeeService,
        private readonly employeeDepartmentPositionService: DomainEmployeeDepartmentPositionService,
        private readonly ssoService: SSOService,
    ) {}

    /**
     * 모든 부서 조회
     */
    async getAllDepartments() {
        this.logger.debug('모든 부서 조회');
        return await this.departmentService.findAll({
            where: { departmentCode: Not('퇴사자'), isCurrent: true },
        });
    }

    /**
     * 특정 부서의 직원 조회
     */
    async getEmployeesByDepartment(departmentId: string, activeOnly: boolean = true) {
        this.logger.debug(`부서별 직원 조회: ${departmentId}, activeOnly: ${activeOnly}`);

        // 부서 존재 여부 확인
        const department = await this.departmentService.findOne({
            where: { id: departmentId, isCurrent: true },
        });
        if (!department) {
            throw new NotFoundException(`ID가 ${departmentId}인 부서를 찾을 수 없습니다`);
        }

        // 해당 부서의 EmployeeDepartmentPosition 레코드 조회
        const edps = await this.employeeDepartmentPositionService.findAll({
            where: { departmentId, isCurrent: true },
            relations: ['employee', 'department', 'position'],
        });

        // 프론트엔드 형식으로 변환
        const employeeMap = new Map<string, any>();

        for (const edp of edps) {
            if (!edp.employee) continue;
            if (!edp.department?.isCurrent) continue;

            // 재직 중인 직원만 필터링
            if (activeOnly && edp.employee.status !== EmployeeStatus.Active) continue;

            const employeeId = edp.employee.id;

            if (!employeeMap.has(employeeId)) {
                employeeMap.set(employeeId, {
                    id: edp.employee.id,
                    employeeNumber: edp.employee.employeeNumber,
                    name: edp.employee.name,
                    email: edp.employee.email,
                    phoneNumber: edp.employee.phoneNumber,
                    status: edp.employee.status,
                    hireDate: edp.employee.hireDate,
                    departments: [],
                });
            }

            const employee = employeeMap.get(employeeId);
            employee.departments.push({
                department: {
                    id: edp.department?.id,
                    departmentCode: edp.department?.departmentCode,
                    departmentName: edp.department?.departmentName,
                },
                position: edp.position
                    ? {
                          id: edp.position.id,
                          positionCode: edp.position.positionCode,
                          positionTitle: edp.position.positionTitle,
                          level: edp.position.level,
                          hasManagementAuthority: edp.position.hasManagementAuthority,
                      }
                    : null,
            });
        }

        return Array.from(employeeMap.values());
    }

    /**
     * 모든 직급 조회
     */
    async getAllPositions() {
        this.logger.debug('모든 직급 조회');
        return await this.positionService.findAll();
    }

    /**
     * 직원 검색
     */
    async searchEmployees(search?: string, departmentId?: string) {
        this.logger.debug(`직원 검색: search=${search}, departmentId=${departmentId}`);

        // EmployeeDepartmentPosition 레코드 조회 (relations 포함)
        if (departmentId) {
            const dept = await this.departmentService.findOne({
                where: { id: departmentId, isCurrent: true },
            });
            if (!dept) {
                return [];
            }
        }

        const whereCondition: Record<string, unknown> = { isCurrent: true };
        if (departmentId) {
            whereCondition.departmentId = departmentId;
        }

        const edps = await this.employeeDepartmentPositionService.findAll({
            where: whereCondition,
            relations: ['employee', 'department', 'position'],
        });

        // 프론트엔드 형식으로 변환
        const employeeMap = new Map<string, any>();

        for (const edp of edps) {
            if (!edp.employee) continue;
            if (!edp.department?.isCurrent) continue;

            // 검색어 필터링
            if (search) {
                const searchLower = search.toLowerCase();
                const matchesSearch =
                    edp.employee.name.toLowerCase().includes(searchLower) ||
                    edp.employee.employeeNumber.toLowerCase().includes(searchLower) ||
                    edp.employee.email?.toLowerCase().includes(searchLower);

                if (!matchesSearch) continue;
            }

            const employeeId = edp.employee.id;

            if (!employeeMap.has(employeeId)) {
                employeeMap.set(employeeId, {
                    id: edp.employee.id,
                    employeeNumber: edp.employee.employeeNumber,
                    name: edp.employee.name,
                    email: edp.employee.email,
                    phoneNumber: edp.employee.phoneNumber,
                    status: edp.employee.status,
                    hireDate: edp.employee.hireDate,
                    departments: [],
                });
            }

            const employee = employeeMap.get(employeeId);
            employee.departments.push({
                department: {
                    id: edp.department?.id,
                    departmentCode: edp.department?.departmentCode,
                    departmentName: edp.department?.departmentName,
                },
                position: edp.position
                    ? {
                          id: edp.position.id,
                          positionCode: edp.position.positionCode,
                          positionTitle: edp.position.positionTitle,
                          level: edp.position.level,
                          hasManagementAuthority: edp.position.hasManagementAuthority,
                      }
                    : null,
            });
        }

        return Array.from(employeeMap.values());
    }

    /**
     * 직원 상세 조회
     */
    async getEmployeeById(employeeId: string) {
        this.logger.debug(`직원 상세 조회: ${employeeId}`);

        const employee = await this.employeeService.findOne({ where: { id: employeeId } });
        if (!employee) {
            throw new NotFoundException(`ID가 ${employeeId}인 직원을 찾을 수 없습니다`);
        }

        // 해당 직원의 EmployeeDepartmentPosition 레코드 조회
        const edps = await this.employeeDepartmentPositionService.findAll({
            where: { employeeId, isCurrent: true },
            relations: ['department', 'position'],
        });

        // 프론트엔드 형식으로 변환
        return {
            id: employee.id,
            employeeNumber: employee.employeeNumber,
            name: employee.name,
            email: employee.email,
            phoneNumber: employee.phoneNumber,
            status: employee.status,
            hireDate: employee.hireDate,
            departments: edps
                .filter((edp) => edp.department?.isCurrent)
                .map((edp) => ({
                    department: {
                        id: edp.department?.id,
                        departmentCode: edp.department?.departmentCode,
                        departmentName: edp.department?.departmentName,
                    },
                    position: edp.position
                        ? {
                              id: edp.position.id,
                              positionCode: edp.position.positionCode,
                              positionTitle: edp.position.positionTitle,
                              level: edp.position.level,
                              hasManagementAuthority: edp.position.hasManagementAuthority,
                          }
                        : null,
                })),
        };
    }

    /**
     * 계층구조 형태의 부서 및 직원 조회
     */
    async getDepartmentHierarchyWithEmployees(activeOnly: boolean = true) {
        this.logger.debug(`계층구조 부서 및 직원 조회: activeOnly=${activeOnly}`);

        // 모든 부서 조회
        const allDepartments = await this.departmentService.findAll({
            where: { departmentCode: Not('퇴사자'), isCurrent: true },
            order: { order: 'ASC' },
        });

        // 모든 EmployeeDepartmentPosition 조회
        const allEdps = await this.employeeDepartmentPositionService.findAll({
            where: { isCurrent: true },
            relations: ['employee', 'department', 'position'],
        });

        // 부서별 직원 맵 생성
        const departmentEmployeesMap = new Map<string, any[]>();

        const currentDepartmentIds = new Set(allDepartments.map((d) => d.id));

        for (const edp of allEdps) {
            if (!edp.employee || !edp.departmentId) continue;
            if (!currentDepartmentIds.has(edp.departmentId)) continue;

            // 재직 중인 직원만 필터링
            if (activeOnly && edp.employee.status !== EmployeeStatus.Active) continue;

            const employeeId = edp.employee.id;
            const departmentId = edp.departmentId;

            if (!departmentEmployeesMap.has(departmentId)) {
                departmentEmployeesMap.set(departmentId, []);
            }

            // 해당 부서에 이미 추가된 직원인지 확인
            const existingEmployee = departmentEmployeesMap.get(departmentId)!.find((e) => e.id === employeeId);

            if (!existingEmployee) {
                // 각 부서별로 직원 객체를 새로 생성
                departmentEmployeesMap.get(departmentId)!.push({
                    id: edp.employee.id,
                    employeeNumber: edp.employee.employeeNumber,
                    name: edp.employee.name,
                    email: edp.employee.email,
                    phoneNumber: edp.employee.phoneNumber,
                    status: edp.employee.status,
                    departmentId: departmentId, // 현재 부서 ID
                    positionTitle: edp.position?.positionTitle,
                    positionLevel: edp.position?.level,
                });
            }
        }

        // 계층 구조 생성
        const buildHierarchy = (parentId: string | null = null): any[] => {
            return allDepartments
                .filter((dept) => dept.parentDepartmentId === parentId)
                .map((dept) => ({
                    id: dept.id,
                    departmentCode: dept.departmentCode,
                    departmentName: dept.departmentName,
                    type: dept.type,
                    order: dept.order,
                    parentDepartmentId: dept.parentDepartmentId,
                    employees: departmentEmployeesMap.get(dept.id) || [],
                    children: buildHierarchy(dept.id),
                }));
        };

        return buildHierarchy(null);
    }

    /**
     * 로그인
     */
    async 로그인한다(email: string, password: string) {
        this.logger.debug(`로그인 시도: ${email}`);

        // SSO 로그인
        const loginResult = await this.ssoService.login(email, password);

        this.logger.log(`로그인 성공: ${loginResult.name} (${loginResult.employeeNumber})`);

        return {
            accessToken: loginResult.accessToken,
        };
    }
}
