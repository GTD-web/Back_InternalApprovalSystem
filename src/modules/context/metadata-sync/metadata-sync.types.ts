import type {
    ExportDepartmentDto,
    ExportEmployeeDepartmentPositionDto,
    ExportEmployeeDto,
    ExportPositionDto,
    ExportRankDto,
} from '@lumir-company/sso-sdk';
import type { Role } from '../../../common/enums/role-type.enum';

/**
 * SSO organization export의 부서 DTO + 동기화 시 `isCurrent`
 * (usecase에서 `isActive` → `isCurrent` 매핑 시 함께 전달)
 */
export type MetadataSyncDepartmentInput = ExportDepartmentDto & {
    isCurrent?: boolean;
};

export type MetadataSyncPositionInput = ExportPositionDto;

export type MetadataSyncRankInput = ExportRankDto;

/**
 * SSO export 직원 + 로컬 DB 전용 필드(비밀번호, 역할)
 */
export type MetadataSyncEmployeeInput = ExportEmployeeDto & {
    password?: string | null;
    roles?: Role[];
};

/**
 * SSO export 직원-부서-직책 + 동기화 시 선택적 `isCurrent`
 */
export type MetadataSyncEmployeeDepartmentPositionInput = ExportEmployeeDepartmentPositionDto & {
    isCurrent?: boolean;
};

/**
 * `syncAllMetadata`에 전달하는 전체 페이로드
 */
export interface MetadataSyncAllInput {
    positions: MetadataSyncPositionInput[];
    ranks: MetadataSyncRankInput[];
    departments: MetadataSyncDepartmentInput[];
    employees: MetadataSyncEmployeeInput[];
    employeeDepartmentPositions: MetadataSyncEmployeeDepartmentPositionInput[];
}
