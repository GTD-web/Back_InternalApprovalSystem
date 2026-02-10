# 결재함별 조회 조건 및 쿼리 설계

결재함 종류에 따라 문서 목록을 조회할 때 적용할 조건과, `DocumentFilterBuilder`에서 어떻게 쿼리가 작성되는지를 정리한 문서입니다.

---

## 1. 결재함 정의 요약표

| 결재함명       | 노출대상     | 문서상태값                         | 내 결재단계 / 상태값              | 시나리오 |
|----------------|-------------|------------------------------------|-----------------------------------|----------|
| 임시저장함     | 기안자      | 임시저장                           | -                                 | 나의 상신 전 모든 문서 |
| 상신함         | 기안자      | 전체                               | -                                 | 나의 상신한 모든 문서 |
| 수신함         | 수신자      | 전체                               | -                                 | 내가 수신처로 지정된 문서 |
| 미결함         | 결재자      | 결재진행중                         | 합의·결재 / 대기중                 | 내가 지금 결재해야 하는 문서 |
| 기결함         | 기안자·결재자 | 승인완료·시행완료 + 결재진행중     | 결재/승인, 합의·결재/승인          | 내가 상신한 문서 중 결재완료·시행완료 + 내가 합의·결재에 승인한 문서 |
| 반려함         | 결재자      | 반려됨                             | 합의·결재 / 승인·반려              | 내가 합의·결재자로 있는 문서 중 반려된 문서 |
| 시행함         | 결재자      | 승인완료                           | 시행 / 대기중                      | 내가 지금 시행해야 하는 문서 |
| 수신참조함     | 수신자      | 전체                               | 수신참조 / 미열람·열람             | 내가 수신참조자로 지정된 문서 |

문서상태 enum: `DRAFT`(임시저장), `PENDING`(결재진행중), `APPROVED`(승인완료), `REJECTED`(반려됨), `CANCELLED`(상신취소), `IMPLEMENTED`(시행완료).  
결재단계 타입: `AGREEMENT`(합의), `APPROVAL`(결재), `IMPLEMENTATION`(시행), `REFERENCE`(수신참조).  
단계 상태: `PENDING`(대기중), `APPROVED`(승인/열람), `REJECTED`(반려), `CANCELLED`(취소).

---

## 2. 결재함별 쿼리 조건 상세

### 2.1 임시저장함

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

### 2.2 상신함

- **노출대상**: 기안자 (`document.drafterId = :userId`)
- **문서상태**: 전체 → 상신한 문서이므로 **DRAFT 제외** (`status != DRAFT` 또는 `status IN (PENDING, APPROVED, REJECTED, CANCELLED, IMPLEMENTED)`)
- **내 결재단계/상태**: 없음

**의사 쿼리:**

```sql
WHERE document.drafterId = :userId
  AND document.status != 'DRAFT'
```

옵션으로 `pendingStatusFilter`를 두어 “상신함 내에서도 특정 문서상태만 보기”가 필요하면, 위 조건에 `AND document.status = :targetStatus` 형태를 추가할 수 있음.

**빌더 매핑:** `filterType = 'PENDING'` + 의미 확장(상신함 전체) 또는 별도 `SUBMITTED` 타입 → `applyPendingFilter(qb, userId, options?.pendingStatusFilter)`.  
(현재 네이밍이 PENDING이면 “결재진행중”과 혼동될 수 있으므로, 상신함 전용 타입명은 `SUBMITTED` 등으로 구분하는 것을 권장.)

---

### 2.3 수신함

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
현재 구현은 수신함을 “결재진행중 + 내가 결재자” 등으로 제한하고 있을 수 있으므로, 요구사항대로 **문서상태 전체**로 넓히는 수정이 필요할 수 있음.

---

### 2.4 미결함

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

**빌더 매핑:**  
- 기존 `PENDING_AGREEMENT`(협의만), `PENDING_APPROVAL`(결재만)를 **미결함** 하나로 통합할 경우:  
  새 타입 `PENDING_MINE`(또는 `PENDING_AGREEMENT_OR_APPROVAL`)에서 `applyPendingAgreementOrApprovalFilter` 같은 단일 메서드로 위 조건 적용.  
- 또는 기존처럼 `PENDING_AGREEMENT` / `PENDING_APPROVAL` 두 개를 유지하고, UI에서 “미결함”은 두 결과를 합쳐서 보여줄 수 있음.  
  이 경우 쿼리 설계는 “합의 대기” + “결재 대기” 각각 위와 동일한 순서 조건으로 작성.

---

### 2.5 기결함

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

### 2.6 반려함

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

### 2.7 시행함

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

### 2.8 수신참조함

- **노출대상**: 수신자 (참조자)
- **문서상태**: **전체** (참조는 문서상태와 무관하게 열람 가능하므로, 수신참조함도 문서상태 제한 없음)
- **내 결재단계/상태**: **수신참조(REFERENCE)** / **미열람(PENDING)** 또는 **열람(APPROVED)**  
  → 옵션 `referenceReadStatus`로 “미열람만 / 열람만 / 전체” 제어.

**의사 쿼리:**

```sql
WHERE document.drafterId != :userId
  AND document.id IN (
    SELECT ass."documentId"
    FROM approval_step_snapshots ass
    WHERE ass."approverId" = :userId
      AND ass."stepType" = 'REFERENCE'
      -- 옵션: AND ass.status = :referenceReadStatus  ('PENDING' | 'APPROVED')
  )
```

문서상태 조건은 두지 않음 (전체).  
**빌더 매핑:** `filterType = 'RECEIVED_REFERENCE'` → `applyReceivedReferenceFilter(qb, userId, options?.referenceReadStatus)`.  
기존에 `document.status IN (APPROVED, REJECTED, IMPLEMENTED)` 등으로 제한했다면, 요구사항에 맞게 **문서상태 제한 제거**하도록 수정.

---

## 3. filterType ↔ 결재함 매핑 제안

| 결재함명   | filterType (제안)     | 비고 |
|-----------|------------------------|------|
| 임시저장함 | `DRAFT`               | 유지 |
| 상신함     | `SUBMITTED` 또는 `PENDING`(의미: 상신전체) | 상신함 = DRAFT 제외 전체. 기존 PENDING이 “결재진행중”만 가리키면 `SUBMITTED` 분리 권장 |
| 수신함     | `RECEIVED`            | 문서상태 전체, 수신자 = approver로 있는 모든 문서 |
| 미결함     | `PENDING_MINE` 또는 `PENDING_AGREEMENT` + `PENDING_APPROVAL` | 합의·결재 / 대기 + 앞선 단계 모두 완료 |
| 기결함     | `APPROVED`            | 기안자: APPROVED·IMPLEMENTED / 결재자: 위 + PENDING 중 “내가 합의·결재 승인한 문서” |
| 반려함     | `REJECTED`            | 결재자, 합의·결재 단계로 참여, 문서 REJECTED |
| 시행함     | `IMPLEMENTATION`      | 문서 APPROVED, 시행 단계 PENDING |
| 수신참조함 | `RECEIVED_REFERENCE`  | 문서상태 전체, REFERENCE 단계, 옵션으로 미열람/열람 |

---

## 4. DocumentFilterBuilder 수정 시 반영 사항 체크리스트

1. **임시저장함**: `applyDraftFilter` — 조건 유지 (`drafterId = userId`, `status = DRAFT`).
2. **상신함**: 상신한 문서 전체를 위한 타입 정리. `applyPendingFilter`가 “DRAFT 제외 전체”를 담당하는지 확인하고, 이름/의미가 상신함과 일치하도록 조정.
3. **수신함**: `applyReceivedFilter` — 문서상태를 **전체**로 넓히기. (현재 PENDING 등으로 제한되어 있다면 제거.)
4. **미결함**: 합의·결재 모두 “대기중 + 앞선 단계 완료” 조건으로 통합 쿼리 또는 기존 AGREEMENT/APPROVAL 각각 유지. `stepType IN (AGREEMENT, APPROVAL)` 및 순서 조건 일치 여부 확인.
5. **기결함**: `applyApprovedFilter` — 기안자(상신 문서 중 APPROVED·IMPLEMENTED) + 결재자(합의·결재에서 승인한 문서, 문서상태 PENDING/APPROVED/IMPLEMENTED) OR 조건 반영.
6. **반려함**: `applyRejectedFilter` — “내가 합의·결재자로 있는 문서”만 (`stepType IN (AGREEMENT, APPROVAL)`).
7. **시행함**: `applyImplementationFilter` — 문서 APPROVED, 시행 단계 PENDING 유지.
8. **수신참조함**: `applyReceivedReferenceFilter` — 문서상태 조건 제거(전체), REFERENCE + approverId만 적용. `referenceReadStatus`로 미열람/열람 필터 유지.

이 문서를 기준으로 `document-filter.builder.ts`를 수정하면, 결재함별 노출 조건과 쿼리가 일치하게 됩니다.
