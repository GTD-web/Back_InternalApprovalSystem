import { ApprovalStepType, AssigneeRule } from '../enums/approval.enum';

/**
 * 결재 규칙과 단계 타입의 유효성 검증 유틸리티
 * ApprovalStepType과 AssigneeRule의 조합이 유효한지 검증합니다.
 */
export class ApprovalRuleValidator {
    /**
     * 각 ApprovalStepType에 허용되는 AssigneeRule 매핑
     */
    private static readonly RULE_MAP: Record<ApprovalStepType, AssigneeRule[]> = {
        [ApprovalStepType.AGREEMENT]: [AssigneeRule.FIXED],
        [ApprovalStepType.APPROVAL]: [
            AssigneeRule.FIXED,
            AssigneeRule.DRAFTER,
            AssigneeRule.HIERARCHY_TO_SUPERIOR,
            AssigneeRule.HIERARCHY_TO_POSITION,
        ],
        [ApprovalStepType.IMPLEMENTATION]: [AssigneeRule.FIXED, AssigneeRule.DRAFTER],
        [ApprovalStepType.REFERENCE]: [AssigneeRule.FIXED, AssigneeRule.DEPARTMENT_REFERENCE],
    };

    /**
     * 특정 ApprovalStepType에 대해 사용 가능한 AssigneeRule 목록을 반환합니다.
     * @param stepType 결재 단계 타입
     * @returns 허용되는 AssigneeRule 배열
     */
    static getAllowedRules(stepType: ApprovalStepType): AssigneeRule[] {
        return this.RULE_MAP[stepType] ?? [AssigneeRule.FIXED];
    }

    /**
     * 특정 ApprovalStepType과 AssigneeRule 조합이 유효한지 검증합니다.
     * @param stepType 결재 단계 타입
     * @param rule 할당 규칙
     * @returns 유효한 조합인지 여부
     */
    static isValid(stepType: ApprovalStepType, rule: AssigneeRule): boolean {
        return this.getAllowedRules(stepType).includes(rule);
    }

    /**
     * AssigneeRule에 필요한 target 필드 정보를 반환합니다.
     * @param rule 할당 규칙
     * @returns 필요한 target 필드 정보
     */
    static getRequiredTargetFields(rule: AssigneeRule): {
        needsEmployee?: boolean;
        needsDepartment?: boolean;
        needsPosition?: boolean;
    } {
        switch (rule) {
            case AssigneeRule.FIXED:
                return { needsEmployee: true };
            /*
                HIERARCHY_TO_POSITION 규칙은 직책 정보가 필요했었는데, 우선 필요하지 않은 것으로 처리.
            */
            case AssigneeRule.HIERARCHY_TO_POSITION:
                return { needsPosition: false };
            case AssigneeRule.DEPARTMENT_REFERENCE:
                return { needsDepartment: true };
            case AssigneeRule.DRAFTER:
            case AssigneeRule.HIERARCHY_TO_SUPERIOR:
                return {}; // target 필드 불필요
            default:
                return {};
        }
    }

    /**
     * AssigneeRule에 필요한 target 필드가 모두 제공되었는지 검증합니다.
     * @param rule 할당 규칙
     * @param targetFields 제공된 target 필드들
     * @returns 필요한 필드가 모두 제공되었는지 여부
     */
    static validateRequiredTargetFields(
        rule: AssigneeRule,
        targetFields: {
            targetEmployeeId?: string;
            targetDepartmentId?: string;
            targetPositionId?: string;
            targetRankId?: string;
        },
    ): { isValid: boolean; missingFields: string[] } {
        const required = this.getRequiredTargetFields(rule);
        const missingFields: string[] = [];

        if (required.needsEmployee && !targetFields.targetEmployeeId) {
            missingFields.push('targetEmployeeId');
        }
        if (required.needsDepartment && !targetFields.targetDepartmentId) {
            missingFields.push('targetDepartmentId');
        }
        if (required.needsPosition && !targetFields.targetPositionId) {
            missingFields.push('targetPositionId');
        }

        return {
            isValid: missingFields.length === 0,
            missingFields,
        };
    }

    /**
     * 전체 검증 (stepType + rule + targetFields)
     * @param stepType 결재 단계 타입
     * @param rule 할당 규칙
     * @param targetFields 제공된 target 필드들
     * @returns 검증 결과
     */
    static validateComplete(
        stepType: ApprovalStepType,
        rule: AssigneeRule,
        targetFields?: {
            targetEmployeeId?: string;
            targetDepartmentId?: string;
            targetPositionId?: string;
        },
    ): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        // 1. stepType과 rule 조합 검증
        if (!this.isValid(stepType, rule)) {
            errors.push(
                `${stepType} 타입에서는 ${rule} 규칙을 사용할 수 없습니다. 허용되는 규칙: ${this.getAllowedRules(stepType).join(', ')}`,
            );
        }

        // 2. 필요한 target 필드 검증
        if (targetFields) {
            const targetValidation = this.validateRequiredTargetFields(rule, targetFields);
            if (!targetValidation.isValid) {
                errors.push(`${rule} 규칙에는 다음 필드가 필요합니다: ${targetValidation.missingFields.join(', ')}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}
