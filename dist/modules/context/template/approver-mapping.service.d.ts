import { DomainDocumentTemplateService } from '../../domain/document-template/document-template.service';
import { DomainEmployeeService } from '../../domain/employee/employee.service';
import { DomainDepartmentService } from '../../domain/department/department.service';
import { DocumentTemplateWithApproversResponseDto } from 'src/modules/business/document/dtos';
export declare class ApproverMappingService {
    private readonly documentTemplateService;
    private readonly employeeService;
    private readonly departmentService;
    private readonly logger;
    constructor(documentTemplateService: DomainDocumentTemplateService, employeeService: DomainEmployeeService, departmentService: DomainDepartmentService);
    getDocumentTemplateWithMappedApprovers(templateId: string, drafterId: string): Promise<DocumentTemplateWithApproversResponseDto>;
    private findDirectSuperior;
    private findHierarchyApprovers;
    private isDepartmentHead;
    private findDepartmentHead;
    private getDepartmentPathToRoot;
    private findDepartmentEmployees;
    private getEmployeeDepartmentPosition;
    private findDirectSuperiorWithPosition;
    private findDepartmentHeadWithPosition;
    private findDepartmentEmployeesWithPosition;
}
