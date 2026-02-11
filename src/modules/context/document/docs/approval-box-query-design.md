# 결재함별 조회 조건 및 쿼리 설계

결재함 종류에 따라 문서 목록을 조회할 때 적용할 조건과, `DocumentFilterBuilder`에서 어떻게 쿼리가 작성되는지를 정리한 문서입니다.

---

## 1. 결재함 정의 요약표 (filterType 기준)

통계·목록 조회에 사용하는 **filterType** 순서 및 결재함 정의는 아래와 같다.

| filterType         | 결재함명   | 노출대상      | 문서상태값                         | 내 결재단계 / 상태값              | 시나리오 |
|--------------------|------------|---------------|------------------------------------|-----------------------------------|----------|
| `DRAFT`            | 임시저장함 | 기안자        | 임시저장                           | -                                 | 나의 상신 전 모든 문서 |
| `RECEIVED`         | 수신함     | 수신자        | 전체                               | -                                 | 내가 수신처로 지정된 문서 |
| `SUBMITTED`        | 상신함     | 기안자        | DRAFT 제외 전체                    | -                                 | 나의 상신한 모든 문서 |
| `PENDING`          | 미결함     | 결재자        | 결재진행중                         | 합의·결재 / 대기중                 | 내가 지금 결재해야 하는 문서 |
| `APPROVED`         | 기결함     | 기안자·결재자 | 승인완료·시행완료 + 결재진행중     | 결재/승인, 합의·결재/승인          | 내가 상신한 문서 중 결재완료·시행완료 + 내가 합의·결재에 승인한 문서 |
| `REJECTED`         | 반려함     | 결재자        | 반려됨                             | 합의·결재 / 승인·반려              | 내가 합의·결재자로 있는 문서 중 반려된 문서 |
| `IMPLEMENTATION`   | 시행함     | 결재자        | 승인완료                           | 시행 / 대기중                      | 내가 지금 시행해야 하는 문서 |
| `RECEIVED_REFERENCE` | 수신참조함 | 수신자      | REJECTED·CANCELLED 제외            | 수신참조 / 미열람·열람             | 내가 수신참조자로 지정된 문서 |

**참고:** 문서상태 enum: `DRAFT`(임시저장), `PENDING`(결재진행중), `APPROVED`(승인완료), `REJECTED`(반려됨), `CANCELLED`(상신취소), `IMPLEMENTED`(시행완료).  
결재단계 타입: `AGREEMENT`(합의), `APPROVAL`(결재), `IMPLEMENTATION`(시행), `REFERENCE`(수신참조).  
단계 상태: `PENDING`(대기중), `APPROVED`(승인/열람), `REJECTED`(반려), `CANCELLED`(취소).

---

## 2. 결재함별 쿼리 조건 상세

### 2.1 임시저장함 (`DRAFT`)

- **노출대상**: 기안자 (`document.drafterId = :userId`)
- **문서상태**: 임시저장만 → `document.status = DRAFT`
- **내 결재단계/상태**: 없음 (문서 레벨만으로 판단)

**의사 쿼리:**

```sql
WHERE document.drafterId = :userId
  AND document.status = 'DRAFT'
```

**빌더 매핑:** `filterType = 'DRAFT'` → `applyDraftFilter(qb, userId)`

---

### 2.2 수신함 (`RECEIVED`)

- **노출대상**: 수신자 = 결재라인에 포함된 사람 (`approval_step_snapshots.approverId = :userId`), 단 **기안자 제외** (`document.drafterId != :userId`)
- **문서상태**: **전체** (제한 없음)
- **내 결재단계/상태**: 제한 없음. “수신처로 지정된 문서”이므로, 내가 approver로 있는 **모든 단계 타입** 포함(합의·결재·시행·참조 모두 수신함에 노출 가능하다고 가정).

**의사 쿼리:**

```sql
WHERE document.drafterId != :userId
  AND document.id IN (
    SELECT ass."documentId"
    FROM approval_step_snapshots ass
    WHERE ass."approverId" = :userId
  )
```

문서상태 조건은 두지 않음.  
옵션으로 “수신 중인 단계 타입”만 보려면 `receivedStepType`(예: APPROVAL만)으로 서브쿼리에 `AND ass."stepType" IN (:...receivedStepTypes)` 추가 가능.

**빌더 매핑:** `filterType = 'RECEIVED'` → `applyReceivedFilter(qb, userId, options?.receivedStepType)`.

---

### 2.3 상신함 (`SUBMITTED`)

- **노출대상**: 기안자 (`document.drafterId = :userId`)
- **문서상태**: 전체 → 상신한 문서이므로 **DRAFT 제외** (`status != DRAFT` 또는 `status IN (PENDING, APPROVED, REJECTED, CANCELLED, IMPLEMENTED)`)
- **내 결재단계/상태**: 없음

**의사 쿼리:**

```sql
WHERE document.drafterId = :userId
  AND document.status != 'DRAFT'
```

옵션으로 `pendingStatusFilter`를 두어 “상신함 내에서도 특정 문서상태만 보기”가 필요하면, 위 조건에 `AND document.status = :targetStatus` 형태를 추가할 수 있음.

**빌더 매핑:** `filterType = 'SUBMITTED'` → `applyPendingFilter(qb, userId, options?.pendingStatusFilter)` (상신함 = DRAFT 제외 전체).

---

### 2.4 미결함 (`PENDING`)

- **노출대상**: 결재자 (기안자 제외, 내가 결재라인에 있음)
- **문서상태**: **결재진행중** → `document.status = PENDING`
- **내 결재단계/상태**: **합의(AGREEMENT) 또는 결재(APPROVAL) / 대기중(PENDING)**  
  즉, “지금 내가 처리해야 하는” 단계 = 내 step이 PENDING이고, **내 stepOrder보다 작은 모든 단계가 이미 APPROVED**인 경우.

**의사 쿼리:**

```sql
WHERE document.drafterId != :userId
  AND document.status = 'PENDING'
  AND document.id IN (
    SELECT my_step."documentId"
    FROM approval_step_snapshots my_step
    INNER JOIN documents d ON d.id = my_step."documentId"
    WHERE my_step."approverId" = :userId
      AND my_step."stepType" IN ('AGREEMENT', 'APPROVAL')
      AND my_step.status = 'PENDING'
      AND NOT EXISTS (
        SELECT 1
        FROM approval_step_snapshots prior_step
        WHERE prior_step."documentId" = my_step."documentId"
          AND prior_step."stepOrder" < my_step."stepOrder"
          AND prior_step.status != 'APPROVED'
      )
  )
```

- “앞선 단계가 모두 완료”는 `prior_step.status = 'PENDING'`인 것이 하나도 없어야 한다는 조건으로도 표현 가능 (현재 빌더의 `NOT EXISTS (prior_step.status = PENDING)` 방식과 동일 개념).
- **미결함 하나**에 “합의 대기 + 결재 대기”를 모두 포함하므로, `stepType IN (AGREEMENT, APPROVAL)` 로 한 번에 조회.

**빌더 매핑:** `filterType = 'PENDING'` → `applyPendingMineFilter(qb, userId)` 또는 `applyPendingApprovalFilter` 등.  
미결함 하나에 “합의 대기 + 결재 대기”를 포함하므로 `stepType IN (AGREEMENT, APPROVAL)` + “앞선 단계 모두 완료” 조건으로 단일 쿼리 적용.

---

### 2.5 기결함 (`APPROVED`)

- **노출대상**: **기안자** 또는 **결재자**
- **문서상태**  
  - 기안자: **승인완료(APPROVED), 시행완료(IMPLEMENTED)**  
  - 결재자: 위 두 상태 + **결재진행중(PENDING)** 중 “내가 합의·결재에 이미 승인한 문서”
- **내 결재단계/상태**  
  - 기안자: 없음 (문서만 보면 됨)  
  - 결재자: **결재(APPROVAL) 또는 합의(AGREEMENT) / 승인(APPROVED)**  
    → 결재진행중이어도 “내 단계는 이미 승인한 문서”를 기결함에 포함.

**의사 쿼리:**

```sql
WHERE (
  -- 기안자: 내가 상신한 문서 중 결재완료·시행완료
  ( document.drafterId = :userId
    AND document.status IN ('APPROVED', 'IMPLEMENTED') )
  OR
  -- 결재자: 내가 합의·결재에 승인한 문서 (문서가 결재진행중/승인완료/시행완료)
  ( document.drafterId != :userId
    AND document.status IN ('PENDING', 'APPROVED', 'IMPLEMENTED')
    AND document.id IN (
      SELECT ass."documentId"
      FROM approval_step_snapshots ass
      WHERE ass."approverId" = :userId
        AND ass."stepType" IN ('AGREEMENT', 'APPROVAL')
        AND ass.status = 'APPROVED'
    ) )
)
```

- 기안자: “상신한 문서 중 결재완료·시행완료”만.  
- 결재자: “내가 합의·결재 단계에서 이미 승인(APPROVED)한 문서”이고, 문서 상태는 PENDING(아직 다른 결재자 대기) 또는 APPROVED, IMPLEMENTED.

**빌더 매핑:** `filterType = 'APPROVED'` → `applyApprovedFilter(qb, userId, options?.drafterFilter)`.  
`drafterFilter`로 “기안자만 / 결재자만 / 둘 다”를 제어할 수 있도록 하거나, 기결함은 위 OR 조건을 한 번에 적용하는 단일 메서드로 구현.

---

### 2.6 반려함 (`REJECTED`)

- **노출대상**: 결재자 (기안자 제외)
- **문서상태**: **반려됨** → `document.status = REJECTED`
- **내 결재단계/상태**: **합의·결재(AGREEMENT, APPROVAL)** 로 참여한 문서만. 단계 상태는 “승인·반려” 모두 포함(반려된 문서이므로 어떤 결재자가 반려했든, 합의·결재자로 있으면 반려함에 노출).

**의사 쿼리:**

```sql
WHERE document.drafterId != :userId
  AND document.status = 'REJECTED'
  AND document.id IN (
    SELECT ass."documentId"
    FROM approval_step_snapshots ass
    WHERE ass."approverId" = :userId
      AND ass."stepType" IN ('AGREEMENT', 'APPROVAL')
  )
```

**빌더 매핑:** `filterType = 'REJECTED'` → `applyRejectedFilter(qb, userId, options?.drafterFilter)`.  
반려함은 “결재자” 전용이면 `drafterId != :userId` 유지하고, 서브쿼리에서 `stepType IN (AGREEMENT, APPROVAL)` 로 한정.

---

### 2.7 시행함 (`IMPLEMENTATION`)

- **노출대상**: 결재자 (시행자)
- **문서상태**: **승인완료** → `document.status = APPROVED`
- **내 결재단계/상태**: **시행(IMPLEMENTATION) / 대기중(PENDING)**

**의사 쿼리:**

```sql
WHERE document.status = 'APPROVED'
  AND document.id IN (
    SELECT ass."documentId"
    FROM approval_step_snapshots ass
    WHERE ass."approverId" = :userId
      AND ass."stepType" = 'IMPLEMENTATION'
      AND ass.status = 'PENDING'
  )
```

**빌더 매핑:** `filterType = 'IMPLEMENTATION'` → `applyImplementationFilter(qb, userId)`.

---

### 2.8 수신참조함 (`RECEIVED_REFERENCE`)

- **노출대상**: 수신자 (참조자)
- **문서상태**: **반려(REJECTED)·취소(CANCELLED) 제외** — 수신참조함에는 반려·취소된 문서를 노출하지 않음. 그 외 상태(DRAFT, PENDING, APPROVED, IMPLEMENTED)는 제한 없음.
- **내 결재단계/상태**: **수신참조(REFERENCE)** / **미열람(PENDING)** 또는 **열람(APPROVED)**  
  → 옵션 `referenceReadStatus`로 “미열람만 / 열람만 / 전체” 제어.

**의사 쿼리:**

```sql
WHERE document.drafterId != :userId
  AND document.status NOT IN ('REJECTED', 'CANCELLED')
  AND document.id IN (
    SELECT ass."documentId"
    FROM approval_step_snapshots ass
    WHERE ass."approverId" = :userId
      AND ass."stepType" = 'REFERENCE'
      -- 옵션: AND ass.status = :referenceReadStatus  ('PENDING' | 'APPROVED')
  )
```

**빌더 매핑:** `filterType = 'RECEIVED_REFERENCE'` → `applyReceivedReferenceFilter(qb, userId, options?.referenceReadStatus)`.  
빌더 구현 시 `document.status NOT IN ('REJECTED', 'CANCELLED')` 조건을 반드시 포함하여 반려·취소 문서가 수신참조함에 노출되지 않도록 한다.

---

## 3. filterType ↔ 결재함 매핑 (통계·목록 조회 기준)

`document-query.service.ts` 등에서 사용하는 **filterType** 배열 순서 및 결재함 매핑은 아래와 같다.

| 순서 | filterType           | 결재함명   | 비고 |
|------|----------------------|------------|------|
| 1    | `DRAFT`              | 임시저장함 | 기안자, status = DRAFT |
| 2    | `RECEIVED`           | 수신함     | 수신자, 문서상태 전체, approver로 있는 문서 |
| 3    | `SUBMITTED`          | 상신함     | 기안자, DRAFT 제외 전체 |
| 4    | `PENDING`            | 미결함     | 합의·결재 / 대기 + 앞선 단계 모두 완료 |
| 5    | `APPROVED`           | 기결함     | 기안자: APPROVED·IMPLEMENTED / 결재자: 합의·결재 승인한 문서 |
| 6    | `REJECTED`           | 반려함     | 결재자, 합의·결재 참여, 문서 REJECTED |
| 7    | `IMPLEMENTATION`     | 시행함     | 문서 APPROVED, 시행 단계 PENDING |
| 8    | `RECEIVED_REFERENCE` | 수신참조함 | REJECTED·CANCELLED 제외, REFERENCE 단계, 옵션으로 미열람/열람 |

---

## 4. DocumentFilterBuilder 반영 체크리스트 (filterType 기준)

| filterType           | 결재함   | 빌더 반영 사항 |
|----------------------|----------|----------------|
| `DRAFT`              | 임시저장함 | `applyDraftFilter` — `drafterId = userId`, `status = DRAFT` 유지. |
| `RECEIVED`           | 수신함   | `applyReceivedFilter` — 문서상태 **전체**, 수신자(approver) 문서. |
| `SUBMITTED`          | 상신함   | `applyPendingFilter`(또는 상신 전용 메서드) — 기안자, DRAFT 제외 전체. `pendingStatusFilter` 옵션. |
| `PENDING`            | 미결함   | `applyPendingMineFilter` / `applyPendingApprovalFilter` — 합의·결재 대기 + 앞선 단계 완료. |
| `APPROVED`           | 기결함   | `applyApprovedFilter` — 기안자(APPROVED·IMPLEMENTED) + 결재자(합의·결재 승인 문서). `drafterFilter` 옵션. |
| `REJECTED`           | 반려함   | `applyRejectedFilter` — 결재자, 합의·결재 참여, 문서 REJECTED. |
| `IMPLEMENTATION`     | 시행함   | `applyImplementationFilter` — 문서 APPROVED, 시행 단계 PENDING. |
| `RECEIVED_REFERENCE` | 수신참조함 | `applyReceivedReferenceFilter` — REJECTED·CANCELLED 제외, REFERENCE 단계. `referenceReadStatus` 옵션. |

이 문서의 filterType 순서 및 정의를 기준으로 `document-filter.builder.ts`와 `document-query.service.ts`의 필터 타입 배열을 맞추면, 결재함별 노출 조건과 통계·목록 쿼리가 일치합니다.
