# 시드 모듈 (Seed)

결재 플로우·결재함 쿼리 테스트를 위한 시드 데이터 생성 및 **메타데이터 제외 전체 삭제**를 제공합니다.

- [approval-process-flow.md](../../business/approval-process/docs/approval-process-flow.md) — 플로우 테스트
- [approval-box-query-design.md](../../context/document/docs/approval-box-query-design.md) — 결재함 쿼리 테스트

---

## API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/seed/delete-all` | 전체 삭제 (메타데이터 제외) |
| POST | `/seed/run` | 시드 데이터 생성 |

---

## 전체 삭제 (delete-all)

**삭제 대상**

- `comments`
- `approval_step_snapshots`
- `document_revisions`
- `documents`

**유지 (메타데이터)**

- `employees`, `departments`, `positions`, `ranks`
- `employee_department_positions`
- `categories`, `document_templates`, `approval_step_templates`

FK 순서대로 삭제하여 무결성을 지킵니다. 응답 예:

```json
{ "deleted": { "comments": 0, "approval_step_snapshots": 24, "document_revisions": 0, "documents": 9 } }
```

---

## 시드 데이터 생성 (run)

**필수 사전 조건**

- 직원 4명이 이미 존재해야 합니다. (기안자 1명, 결재·협의 2명, 시행·참조 1명)

**Body (RunSeedDto)**

| 필드 | 필수 | 설명 |
|------|------|------|
| drafterId | O | 기안자 ID (임시저장·상신함·기결함) |
| approverBId | O | 결재자1 (협의·결재, 미결함/반려함/기결함) |
| approverCId | O | 결재자2 (결재, 수신함/미결함) |
| implementerRefId | O | 시행·참조자 (시행함/수신참조함) |
| templateId | - | 문서 템플릿 ID (선택) |

**생성되는 문서/상태 요약**

| # | 문서 제목 (시드) | 문서 상태 | 단계 구성 | 테스트 목적 |
|---|------------------|-----------|-----------|-------------|
| 1 | 임시저장 문서 | DRAFT | - | 임시저장함 |
| 2 | 결재진행중 (B협의대기) | PENDING | B(협의 PENDING), C(결재 PENDING) | B 미결함, C 수신함 |
| 3 | 결재진행중 (C결재대기) | PENDING | B(협의 APPROVED), C(결재 PENDING) | C 미결함, B 기결(참여) |
| 4 | 결재완료 (시행대기) | APPROVED | B,C 승인, D(시행 PENDING) | 시행함(D) |
| 5 | 시행완료 | IMPLEMENTED | B, D 시행 완료 | 기결함(기안자) |
| 6 | 반려됨 | REJECTED | B(협의 REJECTED) | 반려함(B, C) |
| 7 | 상신취소 | CANCELLED | B(결재 PENDING) | 상신함(취소) |
| 8 | 수신참조 (D) | PENDING | B 승인, D(참조 PENDING) | 수신참조함 미열람 |
| 9 | 수신참조 열람완료 | PENDING | B 승인, D(참조 APPROVED) | 수신참조함 열람 |

이 구성을 통해 **임시저장함, 상신함, 수신함, 미결함, 기결함, 반려함, 시행함, 수신참조함** 및 **협의 완료·결재 승인·반려·시행 완료·참조 열람·결재 취소·상신 취소** 플로우를 모두 테스트할 수 있습니다.

**사용 순서 권장**

1. 메타데이터(직원 4명 등)가 있으면: `POST /seed/run` 에 위 4개 ID로 요청.
2. 테스트 후 초기화: `POST /seed/delete-all`.
3. 다시 시드: `POST /seed/run`.
