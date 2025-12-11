"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ApproverMappingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApproverMappingService = void 0;
const common_1 = require("@nestjs/common");
const document_template_service_1 = require("../../domain/document-template/document-template.service");
const employee_service_1 = require("../../domain/employee/employee.service");
const department_service_1 = require("../../domain/department/department.service");
const approval_enum_1 = require("../../../common/enums/approval.enum");
const employee_enum_1 = require("../../../common/enums/employee.enum");
let ApproverMappingService = ApproverMappingService_1 = class ApproverMappingService {
    constructor(documentTemplateService, employeeService, departmentService) {
        this.documentTemplateService = documentTemplateService;
        this.employeeService = employeeService;
        this.departmentService = departmentService;
        this.logger = new common_1.Logger(ApproverMappingService_1.name);
    }
    async getDocumentTemplateWithMappedApprovers(templateId, drafterId) {
        this.logger.debug(`문서 템플릿 상세 조회 (결재자 맵핑): ${templateId}, 기안자: ${drafterId}`);
        const template = await this.documentTemplateService.findOneWithError({
            where: { id: templateId },
            relations: ['category', 'approvalStepTemplates', 'approvalStepTemplates.targetEmployee'],
        });
        const drafter = await this.employeeService.findOneWithError({
            where: { id: drafterId },
            relations: ['departmentPositions', 'departmentPositions.department', 'departmentPositions.position'],
        });
        const currentDepartmentPosition = drafter.departmentPositions?.find((dp) => dp.isManager) || drafter.departmentPositions?.[0];
        if (!currentDepartmentPosition) {
            throw new common_1.BadRequestException(`기안자의 부서/직책 정보를 찾을 수 없습니다: ${drafterId}`);
        }
        const drafterDepartment = currentDepartmentPosition.department;
        const drafterPosition = currentDepartmentPosition.position;
        const mappedSteps = await Promise.all(template.approvalStepTemplates.map(async (step) => {
            const mappedStep = {
                ...step,
                mappedApprovers: [],
            };
            switch (step.assigneeRule) {
                case approval_enum_1.AssigneeRule.FIXED:
                    if (step.targetEmployeeId && step.targetEmployee) {
                        const fixedEmployeeDeptPos = await this.getEmployeeDepartmentPosition(step.targetEmployee.id);
                        mappedStep.mappedApprovers = [
                            {
                                employeeId: step.targetEmployee.id,
                                employeeNumber: step.targetEmployee.employeeNumber,
                                name: step.targetEmployee.name,
                                email: step.targetEmployee.email,
                                positionId: fixedEmployeeDeptPos.position?.id,
                                positionTitle: fixedEmployeeDeptPos.position?.positionTitle,
                                departmentId: fixedEmployeeDeptPos.department?.id,
                                departmentName: fixedEmployeeDeptPos.department?.departmentName,
                                type: 'FIXED',
                            },
                        ];
                        delete mappedStep.targetEmployee;
                    }
                    break;
                case approval_enum_1.AssigneeRule.DRAFTER:
                    mappedStep.mappedApprovers = [
                        {
                            employeeId: drafter.id,
                            employeeNumber: drafter.employeeNumber,
                            name: drafter.name,
                            email: drafter.email,
                            positionId: drafterPosition.id,
                            positionTitle: drafterPosition.positionTitle,
                            departmentId: drafterDepartment.id,
                            departmentName: drafterDepartment.departmentName,
                            type: 'DRAFTER',
                        },
                    ];
                    break;
                case approval_enum_1.AssigneeRule.HIERARCHY_TO_SUPERIOR:
                    const superiorResult = await this.findDirectSuperiorWithPosition(drafter, drafterDepartment, drafterPosition);
                    if (superiorResult) {
                        mappedStep.mappedApprovers.push({
                            employeeId: superiorResult.employee.id,
                            employeeNumber: superiorResult.employee.employeeNumber,
                            name: superiorResult.employee.name,
                            email: superiorResult.employee.email,
                            positionId: superiorResult.position?.id,
                            positionTitle: superiorResult.position?.positionTitle,
                            departmentId: superiorResult.department?.id,
                            departmentName: superiorResult.department?.departmentName,
                            type: 'SUPERIOR',
                        });
                    }
                    break;
                case approval_enum_1.AssigneeRule.HIERARCHY_TO_POSITION:
                    const hierarchyApprovers = await this.findHierarchyApprovers(drafter, drafterDepartment, drafterPosition, step.targetPositionId);
                    mappedStep.mappedApprovers = hierarchyApprovers;
                    delete mappedStep.targetPosition;
                    break;
                case approval_enum_1.AssigneeRule.DEPARTMENT_REFERENCE:
                    if (step.targetDepartmentId) {
                        const departmentEmployeesWithPosition = await this.findDepartmentEmployeesWithPosition(step.targetDepartmentId);
                        mappedStep.mappedApprovers = departmentEmployeesWithPosition.map((emp) => ({
                            employeeId: emp.employee.id,
                            employeeNumber: emp.employee.employeeNumber,
                            name: emp.employee.name,
                            email: emp.employee.email,
                            positionId: emp.position?.id,
                            positionTitle: emp.position?.positionTitle,
                            departmentId: emp.department?.id,
                            departmentName: emp.department?.departmentName,
                            type: 'DEPARTMENT_REFERENCE',
                        }));
                        mappedStep.targetDepartment = await this.departmentService.findOne({
                            where: { id: step.targetDepartmentId },
                        });
                    }
                    break;
            }
            return mappedStep;
        }));
        return {
            ...template,
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
            approvalStepTemplates: mappedSteps.sort((a, b) => a.stepOrder - b.stepOrder),
        };
    }
    async findDirectSuperior(employee, department, position) {
        const allEmployees = await this.employeeService.findAll({
            relations: ['departmentPositions', 'departmentPositions.department', 'departmentPositions.position'],
        });
        const superiors = allEmployees.filter((emp) => {
            const empDeptPos = emp.departmentPositions?.find((dp) => dp.departmentId === department.id);
            if (!empDeptPos || emp.id === employee.id)
                return false;
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
            return superiors[0];
        }
        return null;
    }
    async findHierarchyApprovers(drafter, drafterDepartment, drafterPosition, targetPositionId) {
        const approvers = [];
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
        const isDrafterDepartmentHead = drafterPosition.hasManagementAuthority || (await this.isDepartmentHead(drafter, drafterDepartment));
        const departmentPath = await this.getDepartmentPathToRoot(drafterDepartment);
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
    async isDepartmentHead(employee, department) {
        const deptPos = employee.departmentPositions?.find((dp) => dp.departmentId === department.id);
        if (!deptPos)
            return false;
        const allEmployees = await this.employeeService.findAll({
            relations: ['departmentPositions', 'departmentPositions.position'],
        });
        const deptEmployees = allEmployees.filter((emp) => {
            return emp.departmentPositions?.some((dp) => dp.departmentId === department.id);
        });
        if (deptEmployees.length === 0)
            return false;
        const minLevel = Math.min(...deptEmployees
            .map((emp) => {
            const dp = emp.departmentPositions?.find((d) => d.departmentId === department.id);
            return dp?.position?.level ?? 999;
        })
            .filter((level) => level !== 999));
        const empDeptPos = employee.departmentPositions?.find((dp) => dp.departmentId === department.id);
        return empDeptPos?.position?.level === minLevel;
    }
    async findDepartmentHead(departmentId) {
        const allEmployees = await this.employeeService.findAll({
            relations: ['departmentPositions', 'departmentPositions.department', 'departmentPositions.position'],
        });
        const deptEmployees = allEmployees.filter((emp) => {
            return emp.departmentPositions?.some((dp) => dp.departmentId === departmentId);
        });
        if (deptEmployees.length === 0)
            return null;
        let departmentHead = null;
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
    async getDepartmentPathToRoot(department) {
        const path = [department];
        let current = department;
        while (current.parentDepartmentId) {
            const parent = await this.departmentService.findOne({
                where: { id: current.parentDepartmentId },
            });
            if (parent) {
                path.push(parent);
                current = parent;
            }
            else {
                break;
            }
        }
        return path;
    }
    async findDepartmentEmployees(departmentId) {
        const allEmployees = await this.employeeService.findAll({
            relations: ['departmentPositions'],
        });
        return allEmployees.filter((emp) => {
            return emp.departmentPositions?.some((dp) => dp.departmentId === departmentId);
        });
    }
    async getEmployeeDepartmentPosition(employeeId) {
        const employee = await this.employeeService.findOne({
            where: { id: employeeId },
            relations: ['departmentPositions', 'departmentPositions.position', 'departmentPositions.department'],
        });
        if (!employee?.departmentPositions?.length) {
            return { position: null, department: null };
        }
        const currentDeptPos = employee.departmentPositions.find((dp) => dp.isManager) || employee.departmentPositions[0];
        return {
            position: currentDeptPos?.position || null,
            department: currentDeptPos?.department || null,
        };
    }
    async findDirectSuperiorWithPosition(employee, department, position) {
        const allEmployees = await this.employeeService.findAll({
            relations: ['departmentPositions', 'departmentPositions.department', 'departmentPositions.position'],
        });
        const superiors = allEmployees.filter((emp) => {
            const empDeptPos = emp.departmentPositions?.find((dp) => dp.departmentId === department.id);
            if (!empDeptPos || emp.id === employee.id)
                return false;
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
    async findDepartmentHeadWithPosition(departmentId) {
        const allEmployees = await this.employeeService.findAll({
            relations: ['departmentPositions', 'departmentPositions.department', 'departmentPositions.position'],
        });
        const deptEmployees = allEmployees.filter((emp) => {
            return emp.departmentPositions?.some((dp) => dp.departmentId === departmentId);
        });
        if (deptEmployees.length === 0)
            return null;
        let departmentHead = null;
        let headPosition = null;
        let headDepartment = null;
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
    async findDepartmentEmployeesWithPosition(departmentId) {
        const allEmployees = await this.employeeService.findAll({
            where: {
                status: employee_enum_1.EmployeeStatus.Active,
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
};
exports.ApproverMappingService = ApproverMappingService;
exports.ApproverMappingService = ApproverMappingService = ApproverMappingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [document_template_service_1.DomainDocumentTemplateService,
        employee_service_1.DomainEmployeeService,
        department_service_1.DomainDepartmentService])
], ApproverMappingService);
//# sourceMappingURL=approver-mapping.service.js.map