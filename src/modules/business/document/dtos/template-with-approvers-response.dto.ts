import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentTemplateStatus, ApprovalStepType, AssigneeRule } from '../../../../common/enums/approval.enum';
import { DepartmentType } from '../../../../common/enums/department.enum';

/**
 * 부서 정보 DTO
 */
export class DepartmentDto {
    @ApiProperty({
        description: '부서 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '부서명',
        example: '개발팀',
    })
    departmentName: string;

    @ApiProperty({
        description: '부서 코드',
        example: 'DEV',
    })
    departmentCode: string;

    @ApiProperty({
        description: '부서 유형',
        enum: DepartmentType,
        example: DepartmentType.DEPARTMENT,
    })
    type: DepartmentType;

    @ApiPropertyOptional({
        description: '상위 부서 ID',
        example: 'uuid',
    })
    parentDepartmentId?: string;

    @ApiProperty({
        description: '정렬 순서',
        example: 0,
    })
    order: number;

    @ApiProperty({
        description: '생성일',
        example: '2025-11-11T00:00:00.000Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: '수정일',
        example: '2025-11-11T00:00:00.000Z',
    })
    updatedAt: Date;
}

/**
 * 맵핑된 결재자 정보 DTO
 */
export class MappedApproverDto {
    @ApiProperty({
        description: '결재자 ID',
        example: 'uuid',
    })
    employeeId: string;

    @ApiProperty({
        description: '결재자 사번',
        example: 'EMP001',
    })
    employeeNumber: string;

    @ApiProperty({
        description: '결재자 이름',
        example: '홍길동',
    })
    name: string;

    @ApiProperty({
        description: '결재자 이메일',
        example: 'hong@example.com',
    })
    email: string;

    @ApiPropertyOptional({
        description: '직책 ID',
        example: 'uuid',
    })
    positionId?: string;

    @ApiPropertyOptional({
        description: '직책명',
        example: '팀장',
    })
    positionTitle?: string;

    @ApiPropertyOptional({
        description: '부서 ID',
        example: 'uuid',
    })
    departmentId?: string;

    @ApiPropertyOptional({
        description: '부서명',
        example: '개발팀',
    })
    departmentName?: string;

    @ApiProperty({
        description: '할당 유형',
        example: 'FIXED',
    })
    type: string;
}

/**
 * 결재단계 템플릿 (결재자 맵핑 포함) DTO
 */
export class ApprovalStepTemplateWithApproversDto {
    // @ApiProperty({
    //     description: '결재 단계 템플릿 ID',
    //     example: 'uuid',
    // })
    // id: string;

    // @ApiProperty({
    //     description: '문서 템플릿 ID',
    //     example: 'uuid',
    // })
    // documentTemplateId: string;

    @ApiProperty({
        description: '결재 단계 순서',
        example: 1,
    })
    stepOrder: number;

    @ApiProperty({
        description: '결재 단계 타입',
        enum: ApprovalStepType,
        example: ApprovalStepType.APPROVAL,
    })
    stepType: ApprovalStepType;

    @ApiProperty({
        description: '결재자 ID',
        example: 'uuid',
    })
    employeeId: string;

    @ApiProperty({
        description: '결재자 사번',
        example: 'EMP001',
    })
    employeeNumber: string;

    @ApiProperty({
        description: '결재자 이름',
        example: '홍길동',
    })
    name: string;

    @ApiPropertyOptional({
        description: '직책 ID',
        example: 'uuid',
    })
    positionId?: string;

    @ApiPropertyOptional({
        description: '직책명',
        example: '팀장',
    })
    positionTitle?: string;

    @ApiPropertyOptional({
        description: '부서 ID',
        example: 'uuid',
    })
    departmentId?: string;

    @ApiPropertyOptional({
        description: '부서명',
        example: '개발팀',
    })
    departmentName?: string;

    // @ApiProperty({
    //     description: '할당 규칙',
    //     enum: AssigneeRule,
    //     example: AssigneeRule.FIXED,
    // })
    // assigneeRule: AssigneeRule;

    // @ApiPropertyOptional({
    //     description: '대상 직원 ID (FIXED 규칙인 경우)',
    //     example: 'uuid',
    // })
    // targetEmployeeId?: string;

    // @ApiPropertyOptional({
    //     description: '대상 부서 ID (DEPARTMENT_HEAD 규칙인 경우)',
    //     example: 'uuid',
    // })
    // targetDepartmentId?: string;

    // @ApiPropertyOptional({
    //     description: '대상 직책 ID (HIERARCHY_TO_POSITION 규칙인 경우)',
    //     example: 'uuid',
    // })
    // targetPositionId?: string;

    // @ApiProperty({
    //     description: '맵핑된 결재자 목록',
    //     type: [MappedApproverDto],
    // })
    // mappedApprovers: MappedApproverDto[];

    // @ApiPropertyOptional({
    //     description: '대상 부서 정보',
    //     type: DepartmentDto,
    // })
    // targetDepartment?: DepartmentDto;

    // @ApiProperty({
    //     description: '생성일',
    //     example: '2025-11-11T00:00:00.000Z',
    // })
    // createdAt: Date;

    // @ApiProperty({
    //     description: '수정일',
    //     example: '2025-11-11T00:00:00.000Z',
    // })
    // updatedAt: Date;
}

/**
 * 카테고리 응답 DTO
 */
export class CategoryResponseDto {
    @ApiProperty({
        description: '카테고리 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '카테고리 이름',
        example: '인사',
    })
    name: string;

    @ApiProperty({
        description: '카테고리 코드',
        example: 'HR',
    })
    code: string;

    @ApiPropertyOptional({
        description: '카테고리 설명',
        example: '인사 관련 문서',
    })
    description?: string;
}

/**
 * 직책 정보 DTO
 */
export class PositionDto {
    @ApiProperty({
        description: '직책 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '직책명',
        example: '팀장',
    })
    positionTitle: string;

    @ApiProperty({
        description: '직책 코드',
        example: 'MANAGER',
    })
    positionCode: string;

    @ApiProperty({
        description: '직책 레벨',
        example: 3,
    })
    level: number;
}

/**
 * 기안자 부서 정보 DTO
 */
export class DrafterDepartmentDto {
    @ApiProperty({
        description: '부서 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '부서명',
        example: '개발팀',
    })
    departmentName: string;

    @ApiProperty({
        description: '부서 코드',
        example: 'DEV',
    })
    departmentCode: string;
}

/**
 * 기안자 정보 DTO
 */
export class DrafterDto {
    @ApiProperty({
        description: '기안자 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '기안자 사번',
        example: 'EMP001',
    })
    employeeNumber: string;

    @ApiProperty({
        description: '기안자 이름',
        example: '홍길동',
    })
    name: string;

    @ApiProperty({
        description: '기안자 이메일',
        example: 'hong@example.com',
    })
    email: string;

    @ApiProperty({
        description: '기안자 부서 정보',
        type: DrafterDepartmentDto,
    })
    department: DrafterDepartmentDto;

    @ApiProperty({
        description: '기안자 직책 정보',
        type: PositionDto,
    })
    position: PositionDto;
}

/**
 * 결재 단계 템플릿 (타입별 분류) DTO
 */
export class ApprovalStepTemplatesDto {
    @ApiProperty({
        description: '합의 단계 목록',
        type: [ApprovalStepTemplateWithApproversDto],
    })
    agreements: ApprovalStepTemplateWithApproversDto[];

    @ApiProperty({
        description: '결재 단계 목록',
        type: [ApprovalStepTemplateWithApproversDto],
    })
    approvals: ApprovalStepTemplateWithApproversDto[];

    @ApiProperty({
        description: '시행 단계 목록',
        type: [ApprovalStepTemplateWithApproversDto],
    })
    implementations: ApprovalStepTemplateWithApproversDto[];

    @ApiProperty({
        description: '참조 단계 목록',
        type: [ApprovalStepTemplateWithApproversDto],
    })
    references: ApprovalStepTemplateWithApproversDto[];
}

/**
 * 문서 템플릿 (결재자 맵핑 포함) 응답 DTO
 */
export class DocumentTemplateWithApproversResponseDto {
    @ApiProperty({
        description: '문서 템플릿 ID',
        example: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: '문서 템플릿 이름',
        example: '휴가 신청서',
    })
    name: string;

    @ApiProperty({
        description: '문서 템플릿 코드',
        example: 'VAC',
    })
    code: string;

    @ApiPropertyOptional({
        description: '문서 템플릿 설명',
        example: '휴가 신청을 위한 양식',
    })
    description?: string;

    @ApiProperty({
        description: '문서 템플릿 상태',
        enum: DocumentTemplateStatus,
        example: DocumentTemplateStatus.ACTIVE,
    })
    status: DocumentTemplateStatus;

    @ApiProperty({
        description: 'HTML 템플릿',
        example: '<html>...</html>',
    })
    template: string;

    @ApiPropertyOptional({
        description: '카테고리 ID',
        example: 'uuid',
    })
    categoryId?: string;

    @ApiPropertyOptional({
        description: '카테고리 정보',
        type: CategoryResponseDto,
    })
    category?: CategoryResponseDto;

    @ApiProperty({
        description: '기안자 정보',
        type: DrafterDto,
    })
    drafter: DrafterDto;

    @ApiProperty({
        description: '결재 단계 템플릿 (타입별 분류)',
        type: ApprovalStepTemplatesDto,
    })
    approvalStepTemplates: ApprovalStepTemplatesDto;

    @ApiProperty({
        description: '생성일',
        example: '2025-11-11T00:00:00.000Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: '수정일',
        example: '2025-11-11T00:00:00.000Z',
    })
    updatedAt: Date;
}
