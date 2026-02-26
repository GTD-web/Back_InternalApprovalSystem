import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DomainDocumentTemplateService } from '../../domain/document-template/document-template.service';
import { DomainEmployeeService } from '../../domain/employee/employee.service';
import { DomainDepartmentService } from '../../domain/department/department.service';
import { Employee } from '../../domain/employee/employee.entity';
import { Department } from '../../domain/department/department.entity';
import { Position } from '../../domain/position/position.entity';
import { AssigneeRule, ApprovalStepType } from '../../../common/enums/approval.enum';
import { EmployeeStatus } from '../../../common/enums/employee.enum';
import { DocumentTemplateWithApproversResponseDto } from 'src/modules/business/document/dtos';

/**
 * 결재자 매핑 서비스
 *
 * 역할:
 * - 결재단계 템플릿의 결재자 할당 규칙에 따라 실제 결재자 매핑
 * - 조직 계층 구조 기반 결재자 탐색
 */
@Injectable()
export class ApproverMappingService {
    private readonly logger = new Logger(ApproverMappingService.name);

    constructor(
        private readonly documentTemplateService: DomainDocumentTemplateService,
        private readonly employeeService: DomainEmployeeService,
        private readonly departmentService: DomainDepartmentService,
    ) {}

    /**
     * 문서 템플릿 조회 시 결재자 정보 매핑
     *
     * @param templateId 문서 템플릿 ID
     * @param drafterId 기안자 ID (결재자 정보 맵핑을 위해 필요)
     */
    async getDocumentTemplateWithMappedApprovers(
        templateId: string,
        drafterId: string,
    ): Promise<DocumentTemplateWithApproversResponseDto> {
        this.logger.debug(`문서 템플릿 상세 조회 (결재자 맵핑): ${templateId}, 기안자: ${drafterId}`);

        // 1. 문서 템플릿 조회
        const template = await this.documentTemplateService.findOneWithError({
            where: { id: templateId },
            relations: ['category', 'approvalStepTemplates', 'approvalStepTemplates.targetEmployee'],
        });

        // 2. 기안자 정보 조회
        const drafter = await this.employeeService.findOneWithError({
            where: { id: drafterId },
            relations: ['departmentPositions', 'departmentPositions.department', 'departmentPositions.position'],
        });

        // 3. 기안자의 현재 부서 및 직책 정보
        const currentDepartmentPosition =
            drafter.departmentPositions?.find((dp) => dp.isManager) || drafter.departmentPositions?.[0];
        if (!currentDepartmentPosition) {
            throw new BadRequestException(`기안자의 부서/직책 정보를 찾을 수 없습니다: ${drafterId}`);
        }

        const drafterDepartment = currentDepartmentPosition.department;
        const drafterPosition = currentDepartmentPosition.position;

        // 4. 각 결재단계 템플릿에 대해 결재자 정보 맵핑 (플랫한 구조로 변환)
        type StepInfo = {
            stepOrder: number;
            stepType: ApprovalStepType;
            employeeId: string;
            employeeNumber: string;
            name: string;
            positionId?: string;
            positionTitle?: string;
            departmentId?: string;
            departmentName?: string;
        };
        const flattenedSteps: StepInfo[] = [];

        let stepOrderCounter = 0;

        // 동일 stepType + 동일 employeeId 중복 체크 함수
        const isDuplicate = (stepType: ApprovalStepType, employeeId: string): boolean => {
            return flattenedSteps.some((s) => s.stepType === stepType && s.employeeId === employeeId);
        };

        // 중복 체크 후 추가하는 헬퍼 함수
        const addStepIfNotDuplicate = (stepInfo: Omit<StepInfo, 'stepOrder'>): void => {
            if (!isDuplicate(stepInfo.stepType, stepInfo.employeeId)) {
                flattenedSteps.push({
                    stepOrder: stepOrderCounter++,
                    ...stepInfo,
                });
            }
        };

        for (const step of template.approvalStepTemplates.sort((a, b) => a.stepOrder - b.stepOrder)) {
            switch (step.assigneeRule) {
                case AssigneeRule.FIXED:
                    // 고정 결재자: targetEmployeeId에 지정된 직원
                    if (step.targetEmployeeId && step.targetEmployee) {
                        const fixedEmployeeDeptPos = await this.getEmployeeDepartmentPosition(step.targetEmployee.id);
                        addStepIfNotDuplicate({
                            stepType: step.stepType,
                            employeeId: step.targetEmployee.id,
                            employeeNumber: step.targetEmployee.employeeNumber,
                            name: step.targetEmployee.name,
                            positionId: fixedEmployeeDeptPos.position?.id,
                            positionTitle: fixedEmployeeDeptPos.position?.positionTitle,
                            departmentId: fixedEmployeeDeptPos.department?.id,
                            departmentName: fixedEmployeeDeptPos.department?.departmentName,
                        });
                    }
                    break;

                case AssigneeRule.DRAFTER:
                    // 기안자
                    addStepIfNotDuplicate({
                        stepType: step.stepType,
                        employeeId: drafter.id,
                        employeeNumber: drafter.employeeNumber,
                        name: drafter.name,
                        positionId: drafterPosition.id,
                        positionTitle: drafterPosition.positionTitle,
                        departmentId: drafterDepartment.id,
                        departmentName: drafterDepartment.departmentName,
                    });
                    break;

                case AssigneeRule.HIERARCHY_TO_SUPERIOR:
                    // 기안자의 직속 상급자
                    const superiorResult = await this.findDirectSuperiorWithPosition(
                        drafter,
                        drafterDepartment,
                        drafterPosition,
                    );
                    console.log('superiorResult', superiorResult);
                    if (superiorResult) {
                        addStepIfNotDuplicate({
                            stepType: step.stepType,
                            employeeId: superiorResult.employee.id,
                            employeeNumber: superiorResult.employee.employeeNumber,
                            name: superiorResult.employee.name,
                            positionId: superiorResult.position?.id,
                            positionTitle: superiorResult.position?.positionTitle,
                            departmentId: superiorResult.department?.id,
                            departmentName: superiorResult.department?.departmentName,
                        });
                    }
                    break;

                case AssigneeRule.HIERARCHY_TO_POSITION:
                    // 기안자부터 기안자 소속부서의 부서장과 최상위부서의 부서장까지
                    const hierarchyApprovers = await this.findHierarchyApprovers(
                        drafter,
                        drafterDepartment,
                        drafterPosition,
                        step.targetPositionId,
                    );
                    console.log('hierarchyApprovers', hierarchyApprovers);
                    for (const approver of hierarchyApprovers) {
                        addStepIfNotDuplicate({
                            stepType: step.stepType,
                            employeeId: approver.employeeId,
                            employeeNumber: approver.employeeNumber,
                            name: approver.name,
                            positionId: approver.positionId,
                            positionTitle: approver.positionTitle,
                            departmentId: approver.departmentId,
                            departmentName: approver.departmentName,
                        });
                    }
                    break;

                case AssigneeRule.DEPARTMENT_REFERENCE:
                    // 부서 전체 참조: targetDepartmentId에 지정된 부서의 모든 직원
                    if (step.targetDepartmentId) {
                        const departmentEmployeesWithPosition = await this.findDepartmentEmployeesWithPosition(
                            step.targetDepartmentId,
                        );
                        for (const emp of departmentEmployeesWithPosition) {
                            addStepIfNotDuplicate({
                                stepType: step.stepType,
                                employeeId: emp.employee.id,
                                employeeNumber: emp.employee.employeeNumber,
                                name: emp.employee.name,
                                positionId: emp.position?.id,
                                positionTitle: emp.position?.positionTitle,
                                departmentId: emp.department?.id,
                                departmentName: emp.department?.departmentName,
                            });
                        }
                    }
                    break;
            }
        }

        // 5. stepType별로 분리
        const agreements = flattenedSteps.filter((step) => step.stepType === ApprovalStepType.AGREEMENT);
        const approvals = flattenedSteps.filter((step) => step.stepType === ApprovalStepType.APPROVAL);
        const implementations = flattenedSteps.filter((step) => step.stepType === ApprovalStepType.IMPLEMENTATION);
        const references = flattenedSteps.filter((step) => step.stepType === ApprovalStepType.REFERENCE);

        return {
            id: template.id,
            name: template.name,
            code: template.code,
            description: template.description,
            status: template.status,
            template: template.template,
            categoryId: template.categoryId,
            category: template.category,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            drafter: {
                id: drafter.id,
                employeeNumber: drafter.employeeNumber,
                name: drafter.name,
                email: drafter.email,
                department: {
                    id: drafterDepartment.id,
                    departmentName: drafterDepartment.departmentName,
                    departmentCode: drafterDepartment.departmentCode,
                },
                position: {
                    id: drafterPosition.id,
                    positionTitle: drafterPosition.positionTitle,
                    positionCode: drafterPosition.positionCode,
                    level: drafterPosition.level,
                },
            },
            approvalStepTemplates: {
                agreements,
                approvals,
                implementations,
                references,
            },
        };
    }

    /**
     * 직속 상급자 찾기
     * 같은 부서에서 더 높은 직책을 가진 직원을 찾습니다.
     */
    private async findDirectSuperior(
        employee: Employee,
        department: Department,
        position: Position,
    ): Promise<Employee | null> {
        // 같은 부서의 모든 직원 조회
        const allEmployees = await this.employeeService.findAll({
            relations: ['departmentPositions', 'departmentPositions.department', 'departmentPositions.position'],
        });

        // 같은 부서에서 더 높은 직책(낮은 level)을 가진 직원 찾기
        const superiors = allEmployees.filter((emp) => {
            const empDeptPos = emp.departmentPositions?.find((dp) => dp.departmentId === department.id);
            if (!empDeptPos || emp.id === employee.id) return false;
            const empPosition = empDeptPos.position;
            return empPosition && empPosition.level < position.level;
        });

        // 가장 가까운 상급자 (가장 낮은 level)
        if (superiors.length > 0) {
            superiors.sort((a, b) => {
                const aDeptPos = a.departmentPositions?.find((dp) => dp.departmentId === department.id);
                const bDeptPos = b.departmentPositions?.find((dp) => dp.departmentId === department.id);
                const aLevel = aDeptPos?.position?.level || 999;
                const bLevel = bDeptPos?.position?.level || 999;
                return aLevel - bLevel;
            });
            return superiors[0];
        }

        return null;
    }

    /**
     * 계층 구조 상의 결재자들 찾기
     */
    private async findHierarchyApprovers(
        drafter: Employee,
        drafterDepartment: Department,
        drafterPosition: Position,
        targetPositionId?: string,
    ): Promise<any[]> {
        const approvers: any[] = [];

        // 1. 기안자 추가
        approvers.push({
            employeeId: drafter.id,
            employeeNumber: drafter.employeeNumber,
            name: drafter.name,
            email: drafter.email,
            positionId: drafterPosition.id,
            positionTitle: drafterPosition.positionTitle,
            departmentId: drafterDepartment.id,
            departmentName: drafterDepartment.departmentName,
            type: 'DRAFTER',
        });

        // 2. 기안자가 부서장인지 확인
        const isDrafterDepartmentHead =
            drafterPosition.hasManagementAuthority || (await this.isDepartmentHead(drafter, drafterDepartment));

        // 3. 기안자의 부서부터 최상위 부서까지의 경로 찾기
        const departmentPath = await this.getDepartmentPathToRoot(drafterDepartment);

        // 4. 기안자가 부서장이 아닌 경우, 기안자의 부서의 부서장 추가
        if (!isDrafterDepartmentHead) {
            const drafterDeptHeadResult = await this.findDepartmentHeadWithPosition(drafterDepartment.id);
            if (drafterDeptHeadResult && drafterDeptHeadResult.employee.id !== drafter.id) {
                approvers.push({
                    employeeId: drafterDeptHeadResult.employee.id,
                    employeeNumber: drafterDeptHeadResult.employee.employeeNumber,
                    name: drafterDeptHeadResult.employee.name,
                    email: drafterDeptHeadResult.employee.email,
                    positionId: drafterDeptHeadResult.position?.id,
                    positionTitle: drafterDeptHeadResult.position?.positionTitle,
                    type: 'HIERARCHY',
                    departmentId: drafterDepartment.id,
                    departmentName: drafterDepartment.departmentName,
                    role: '부서장',
                });
            }
        }

        // 5. 상위 부서들의 부서장 찾기
        const parentDepartments = departmentPath.slice(1);
        for (const dept of parentDepartments) {
            const deptHeadResult = await this.findDepartmentHeadWithPosition(dept.id);
            if (deptHeadResult && !approvers.find((a) => a.employeeId === deptHeadResult.employee.id)) {
                approvers.push({
                    employeeId: deptHeadResult.employee.id,
                    employeeNumber: deptHeadResult.employee.employeeNumber,
                    name: deptHeadResult.employee.name,
                    email: deptHeadResult.employee.email,
                    positionId: deptHeadResult.position?.id,
                    positionTitle: deptHeadResult.position?.positionTitle,
                    type: 'HIERARCHY',
                    departmentId: dept.id,
                    departmentName: dept.departmentName,
                    role: '부서장',
                });
            }
        }

        return approvers;
    }

    /**
     * 기안자가 부서장인지 확인
     */
    private async isDepartmentHead(employee: Employee, department: Department): Promise<boolean> {
        const deptPos = employee.departmentPositions?.find((dp) => dp.departmentId === department.id);
        if (!deptPos) return false;

        const allEmployees = await this.employeeService.findAll({
            relations: ['departmentPositions', 'departmentPositions.position'],
        });

        const deptEmployees = allEmployees.filter((emp) => {
            return emp.departmentPositions?.some((dp) => dp.departmentId === department.id);
        });

        if (deptEmployees.length === 0) return false;

        const minLevel = Math.min(
            ...deptEmployees
                .map((emp) => {
                    const dp = emp.departmentPositions?.find((d) => d.departmentId === department.id);
                    return dp?.position?.level ?? 999;
                })
                .filter((level) => level !== 999),
        );

        const empDeptPos = employee.departmentPositions?.find((dp) => dp.departmentId === department.id);
        return empDeptPos?.position?.level === minLevel;
    }

    /**
     * 부서장 찾기
     */
    private async findDepartmentHead(departmentId: string): Promise<Employee | null> {
        const allEmployees = await this.employeeService.findAll({
            relations: ['departmentPositions', 'departmentPositions.department', 'departmentPositions.position'],
        });

        const deptEmployees = allEmployees.filter((emp) => {
            return emp.departmentPositions?.some((dp) => dp.departmentId === departmentId);
        });

        if (deptEmployees.length === 0) return null;

        let departmentHead: Employee | null = null;
        let minLevel = 999;

        for (const emp of deptEmployees) {
            const deptPos = emp.departmentPositions?.find((dp) => dp.departmentId === departmentId);
            if (deptPos?.position) {
                if (deptPos.position.hasManagementAuthority) {
                    return emp;
                }
                if (deptPos.position.level < minLevel) {
                    minLevel = deptPos.position.level;
                    departmentHead = emp;
                }
            }
        }

        return departmentHead;
    }

    /**
     * 부서부터 최상위 부서까지의 경로 찾기
     */
    private async getDepartmentPathToRoot(department: Department): Promise<Department[]> {
        const path: Department[] = [department];
        let current = department;

        while (current.parentDepartmentId) {
            const parent = await this.departmentService.findOne({
                where: { id: current.parentDepartmentId },
            });
            if (parent) {
                path.push(parent);
                current = parent;
            } else {
                break;
            }
        }

        return path;
    }

    /**
     * 부서의 모든 직원 찾기
     */
    private async findDepartmentEmployees(departmentId: string): Promise<Employee[]> {
        const allEmployees = await this.employeeService.findAll({
            relations: ['departmentPositions'],
        });

        return allEmployees.filter((emp) => {
            return emp.departmentPositions?.some((dp) => dp.departmentId === departmentId);
        });
    }

    /**
     * 직원의 부서 및 포지션 정보 조회
     */
    private async getEmployeeDepartmentPosition(
        employeeId: string,
    ): Promise<{ position: Position | null; department: Department | null }> {
        const employee = await this.employeeService.findOne({
            where: { id: employeeId },
            relations: ['departmentPositions', 'departmentPositions.position', 'departmentPositions.department'],
        });

        if (!employee?.departmentPositions?.length) {
            return { position: null, department: null };
        }

        const currentDeptPos =
            employee.departmentPositions.find((dp) => dp.isManager) || employee.departmentPositions[0];
        return {
            position: currentDeptPos?.position || null,
            department: currentDeptPos?.department || null,
        };
    }

    /**
     * 직속 상급자와 부서/포지션 정보 함께 찾기
     */
    private async findDirectSuperiorWithPosition(
        employee: Employee,
        department: Department,
        position: Position,
    ): Promise<{ employee: Employee; position: Position | null; department: Department | null } | null> {
        const allEmployees = await this.employeeService.findAll({
            relations: ['departmentPositions', 'departmentPositions.department', 'departmentPositions.position'],
        });

        const superiors = allEmployees.filter((emp) => {
            const empDeptPos = emp.departmentPositions?.find((dp) => dp.departmentId === department.id);
            if (!empDeptPos || emp.id === employee.id) return false;
            const empPosition = empDeptPos.position;
            return empPosition && empPosition.level < position.level;
        });

        if (superiors.length > 0) {
            superiors.sort((a, b) => {
                const aDeptPos = a.departmentPositions?.find((dp) => dp.departmentId === department.id);
                const bDeptPos = b.departmentPositions?.find((dp) => dp.departmentId === department.id);
                const aLevel = aDeptPos?.position?.level || 999;
                const bLevel = bDeptPos?.position?.level || 999;
                return aLevel - bLevel;
            });

            const superior = superiors[0];
            const superiorDeptPos = superior.departmentPositions?.find((dp) => dp.departmentId === department.id);
            return {
                employee: superior,
                position: superiorDeptPos?.position || null,
                department: superiorDeptPos?.department || null,
            };
        }

        return null;
    }

    /**
     * 부서장과 부서/포지션 정보 함께 찾기
     */
    private async findDepartmentHeadWithPosition(
        departmentId: string,
    ): Promise<{ employee: Employee; position: Position | null; department: Department | null } | null> {
        const allEmployees = await this.employeeService.findAll({
            relations: ['departmentPositions', 'departmentPositions.department', 'departmentPositions.position'],
        });

        const deptEmployees = allEmployees.filter((emp) => {
            return emp.departmentPositions?.some((dp) => dp.departmentId === departmentId);
        });

        if (deptEmployees.length === 0) return null;

        let departmentHead: Employee | null = null;
        let headPosition: Position | null = null;
        let headDepartment: Department | null = null;
        let minLevel = 999;

        for (const emp of deptEmployees) {
            const deptPos = emp.departmentPositions?.find((dp) => dp.departmentId === departmentId);
            if (deptPos?.position) {
                if (deptPos.position.hasManagementAuthority) {
                    return { employee: emp, position: deptPos.position, department: deptPos.department || null };
                }
                if (deptPos.position.level < minLevel) {
                    minLevel = deptPos.position.level;
                    departmentHead = emp;
                    headPosition = deptPos.position;
                    headDepartment = deptPos.department || null;
                }
            }
        }

        return departmentHead ? { employee: departmentHead, position: headPosition, department: headDepartment } : null;
    }

    /**
     * 부서의 모든 직원과 부서/포지션 정보 함께 찾기
     */
    private async findDepartmentEmployeesWithPosition(
        departmentId: string,
    ): Promise<{ employee: Employee; position: Position | null; department: Department | null }[]> {
        const allEmployees = await this.employeeService.findAll({
            where: {
                status: EmployeeStatus.Active,
            },
            relations: ['departmentPositions', 'departmentPositions.position', 'departmentPositions.department'],
        });

        return allEmployees
            .filter((emp) => emp.departmentPositions?.some((dp) => dp.departmentId === departmentId))
            .map((emp) => {
                const deptPos = emp.departmentPositions?.find((dp) => dp.departmentId === departmentId);
                return {
                    employee: emp,
                    position: deptPos?.position || null,
                    department: deptPos?.department || null,
                };
            });
    }
}
