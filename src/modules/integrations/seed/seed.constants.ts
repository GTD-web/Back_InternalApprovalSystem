/**
 * 시드 데이터 식별자
 * 플로우/쿼리 테스트용 고정 ID (실제 시드 시 UUID로 대체 가능)
 */
export const SEED_IDS = {
    /** 기안자 (A): 임시저장·상신·상신취소 테스트 */
    DRAFTER_A: 'seed-drafter-a',
    /** 결재자1 (B): 협의·결재, 미결함/수신함/기결함/반려함 */
    APPROVER_B: 'seed-approver-b',
    /** 결재자2 (C): 결재·수신함·미결함 */
    APPROVER_C: 'seed-approver-c',
    /** 시행·참조 (D): 시행함·수신참조함 */
    IMPLEMENTER_REF_D: 'seed-impl-ref-d',
    /** 카테고리 코드 */
    CATEGORY_CODE: 'SEED_CAT',
    /** 템플릿 코드 */
    TEMPLATE_CODE: 'SEED',
} as const;
