import { ApprovalProcessService } from '../services/approval-process.service';
import { ApproveStepDto, RejectStepDto, CompleteAgreementDto, CompleteImplementationDto, CancelApprovalStepDto, MarkReferenceReadDto, ProcessApprovalActionDto } from '../dtos';
import { Employee } from '../../../domain/employee/employee.entity';
export declare class ApprovalProcessController {
    private readonly approvalProcessService;
    constructor(approvalProcessService: ApprovalProcessService);
    completeAgreement(user: Employee, dto: CompleteAgreementDto): Promise<import("../../../domain").ApprovalStepSnapshot>;
    approveStep(user: Employee, dto: ApproveStepDto): Promise<import("../../../domain").ApprovalStepSnapshot>;
    completeImplementation(user: Employee, dto: CompleteImplementationDto): Promise<import("../../../domain").ApprovalStepSnapshot>;
    markReferenceRead(user: Employee, dto: MarkReferenceReadDto): Promise<import("../../../domain").ApprovalStepSnapshot>;
    rejectStep(user: Employee, dto: RejectStepDto): Promise<import("../../../domain").ApprovalStepSnapshot>;
    cancelApprovalStep(user: Employee, dto: CancelApprovalStepDto): Promise<import("../../../context/approval-process/dtos/approval-action.dto").CancelApprovalStepResultDto>;
    getApprovalSteps(documentId: string): Promise<import("../../../domain").ApprovalStepSnapshot[]>;
    processApprovalAction(dto: ProcessApprovalActionDto): Promise<import("../../../domain").ApprovalStepSnapshot>;
}
