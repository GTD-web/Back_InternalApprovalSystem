# LIAS 전자결재 시스템 운영관리 문서

## 1. 시스템 개요

### 1.1 시스템 목적

본 시스템은 조직의 전자결재 업무를 디지털화하고 효율적으로 관리하기 위한 백엔드 서버 시스템입니다.

### 1.2 시스템 특징

- **3-Layer 아키텍처**: Domain → Context → Business 계층 구조
- **도메인 주도 설계 (DDD)**: 비즈니스 로직을 도메인 모델에 캡슐화
- **CQRS 패턴**: Command와 Query 분리
- **서버리스 배포**: Vercel 플랫폼 기반 배포
- **RESTful API**: Swagger 기반 API 문서화

---

## 2. 서버 구성

### 2.1 단일 서버 아키텍처

#### 2.1.1 LIAS Server

- **포트**: 3000 (개발), 5001 (프로덕션)
- **역할**:
    - 전자결재 시스템의 모든 기능 제공
    - RESTful API 엔드포인트 제공
    - JWT 인증 처리
    - 파일 업로드/다운로드 처리
- **주요 모듈**:
    - **Auth Module**: JWT 기반 로그인/인증
    - **Document Module**: 문서 관리 (생성, 수정, 삭제, 조회)
    - **Template Module**: 문서 템플릿 관리
    - **Approval Process Module**: 결재 프로세스 관리
    - **Metadata Module**: 메타데이터 관리
    - **Notification Module**: 알림 발송 (Firebase Cloud Messaging)
    - **SSO Module**: SSO 통합 인증

---

## 3. 기술 스택

### 3.1 프레임워크 및 언어

- **프레임워크**: NestJS 10.x
- **언어**: TypeScript 5.1.3
- **런타임**: Node.js 18+
- **패키지 매니저**: npm

### 3.2 데이터베이스

- **PostgreSQL**: 메인 데이터베이스
    - 문서, 템플릿, 결재 프로세스, 직원 정보 등 저장
    - SSL 연결 지원 (프로덕션 환경)

### 3.3 주요 라이브러리

```json
{
    "프레임워크": ["@nestjs/core", "@nestjs/common", "@nestjs/platform-express"],
    "데이터베이스": ["typeorm", "pg"],
    "인증": ["@nestjs/jwt", "passport-jwt", "bcrypt"],
    "문서화": ["@nestjs/swagger"],
    "파일처리": ["@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner", "exceljs"],
    "알림": ["firebase-admin"],
    "SSO": ["@lumir-company/sso-sdk"],
    "날짜처리": ["dayjs"],
    "기타": ["axios", "class-validator", "class-transformer"]
}
```

### 3.4 외부 서비스

- **Vercel**: 서버리스 배포 플랫폼
- **AWS S3**: 파일 저장소
- **Firebase**: 푸시 알림 서비스
- **SSO 서비스**: 통합 인증 서비스

---

## 4. 인프라 구성

### 4.1 배포 환경

#### 4.1.1 Vercel 배포

- **플랫폼**: Vercel Serverless Functions
- **빌드 명령어**: `npm run vercel-build`
- **실행 파일**: `dist/main.js`
- **헬스 체크**: `/api/health` (5분마다 자동 호출)

#### 4.1.2 환경별 설정

| 환경     | 포트 | URL                   | 데이터베이스 포트 |
| -------- | ---- | --------------------- | ----------------- |
| 개발     | 3000 | http://localhost:3000 | 5432              |
| 프로덕션 | 5001 | 배포 URL              | 6543 (SSL)        |

---

## 5. 환경 변수 설정

### 5.1 공통 환경 변수

| 변수명   | 설명              | 기본값 |
| -------- | ----------------- | ------ |
| NODE_ENV | 실행 환경         | local  |
| APP_PORT | 애플리케이션 포트 | 3000   |

### 5.2 데이터베이스 환경 변수

```bash
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432  # 개발: 5432, 프로덕션: 6543
POSTGRES_DB=resource-server
POSTGRES_USER=admin
POSTGRES_PASSWORD=tech7admin!
```

### 5.3 JWT 인증 환경 변수

```bash
GLOBAL_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
```

### 5.4 Firebase 환경 변수 (알림)

```bash
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=your-cert-url
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
```

### 5.5 AWS S3 환경 변수 (파일 저장)

```bash
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=your-bucket-name
```

---

## 6. 빌드 및 배포 프로세스

### 6.1 개발 환경

#### 6.1.1 사전 준비

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
# .env 파일 생성 및 환경 변수 설정

# 3. 데이터베이스 마이그레이션 실행
npm run migration:run
```

#### 6.1.2 개발 서버 실행

```bash
# 개발 모드 (watch 모드)
npm run start:dev

# 디버그 모드
npm run start:debug

# 프로덕션 모드 (로컬)
npm run start:prod
```

### 6.2 프로덕션 배포

#### 6.2.1 Vercel 배포 프로세스

**자동 배포 (Git 연동)**

1. GitHub/GitLab 저장소에 코드 푸시
2. Vercel이 자동으로 감지하여 빌드 시작
3. `vercel-build` 스크립트 실행:
    ```bash
    npm run build && npm run migration:run
    ```
4. 배포 완료 후 자동으로 서비스 시작

**수동 배포**

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

#### 6.2.2 빌드 설정

```json
{
    "version": 2,
    "builds": [
        {
            "src": "dist/main.js",
            "use": "@vercel/node"
        }
    ],
    "routes": [
        {
            "src": "/(.*)",
            "dest": "dist/main.js",
            "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
        }
    ],
    "crons": [
        {
            "path": "/api/health",
            "schedule": "*/5 * * * *"
        }
    ]
}
```

---

## 7. 데이터베이스 관리

### 7.1 PostgreSQL 설정

#### 7.1.1 기본 설정

- **데이터베이스명**: resource-server
- **사용자**: admin
- **스키마**: public
- **SSL**: 프로덕션 환경에서 활성화 (포트 6543)

#### 7.1.2 마이그레이션 관리

**마이그레이션 생성**

```bash
npm run migration:generate -- -n MigrationName
```

**마이그레이션 실행**

```bash
# 마이그레이션 실행
npm run migration:run

# 마이그레이션 롤백
npm run migration:revert
```

**마이그레이션 생성 (수동)**

```bash
npm run migration:create -- -n MigrationName
```

#### 7.1.3 주요 엔티티

- **Document**: 문서 엔티티
- **DocumentTemplate**: 문서 템플릿 엔티티
- **ApprovalStepTemplate**: 결재 단계 템플릿 엔티티
- **ApprovalStepSnapshot**: 결재 단계 스냅샷 엔티티
- **Category**: 카테고리 엔티티
- **Employee**: 직원 엔티티
- **Department**: 부서 엔티티
- **Position**: 직위 엔티티
- **Rank**: 직급 엔티티
- **Comment**: 댓글 엔티티
- **DocumentRevision**: 문서 수정 이력 엔티티

#### 7.1.4 백업 전략

**수동 백업**

```bash
# PostgreSQL 백업
pg_dump -U admin -h localhost -p 5432 -d resource-server > backup_$(date +%Y%m%d).sql

# 프로덕션 환경 (SSL)
pg_dump -U admin -h [host] -p 6543 -d resource-server --ssl-mode=require > backup_$(date +%Y%m%d).sql
```

**백업 복원**

```bash
# 백업 파일로 복원
psql -U admin -h localhost -p 5432 -d resource-server < backup_20250105.sql

# 프로덕션 환경 (SSL)
psql -U admin -h [host] -p 6543 -d resource-server --ssl-mode=require < backup_20250105.sql
```

---

## 8. 코드 품질 및 개발 규칙

### 8.1 ESLint 설정

```javascript
// .eslintrc.js
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "no-console": "off",
    "@typescript-eslint/no-explicit-any": "off"
  }
}
```

### 8.2 Prettier 설정

```json
{
    "bracketSpacing": true,
    "singleQuote": true,
    "semi": true,
    "useTabs": false,
    "tabWidth": 4,
    "trailingComma": "all",
    "printWidth": 120
}
```

### 8.3 TypeScript 설정

- **타겟**: ES2021
- **모듈 시스템**: CommonJS
- **데코레이터**: 활성화 (NestJS 필수)
- **소스맵**: 활성화

### 8.4 아키텍처 규칙

#### 8.4.1 3-Layer 구조

```
Presentation Layer (Controllers)
    ↓
Business Layer (Services - 트랜잭션 관리)
    ↓
Context Layer (도메인 간 협력)
    ↓
Domain Layer (엔티티, 도메인 서비스)
```

#### 8.4.2 함수명 규칙

- Context 내의 함수는 '~한다' 형태로 끝나는 한글 함수명 사용
- 예: `문서를생성한다()`, `결재를처리한다()`

#### 8.4.3 트랜잭션 관리

- 트랜잭션은 Business Layer에서만 시작
- `withTransaction` 유틸리티 사용
- Context와 Domain Service는 `queryRunner` 파라미터로 참여

---

## 9. 모니터링 및 로깅

### 9.1 로그 관리

#### 9.1.1 Vercel 로그 확인

```bash
# Vercel CLI를 통한 로그 확인
vercel logs [deployment-url]

# 실시간 로그 스트리밍
vercel logs --follow
```

#### 9.1.2 로그 레벨

- 개발 환경: `development` (디버그 로그 포함)
- 프로덕션: `production` (주요 로그만)

### 9.2 헬스 체크

**자동 헬스 체크**

- Vercel Cron Job: `/api/health` 엔드포인트를 5분마다 자동 호출
- 서비스 상태 모니터링

**수동 헬스 체크**

```bash
# 헬스 체크 엔드포인트 호출
curl https://your-vercel-url.vercel.app/api/health
```

### 9.3 데이터베이스 모니터링

```bash
# PostgreSQL 연결 확인
psql -U admin -h localhost -p 5432 -d resource-server -c "SELECT version();"

# 테이블 목록 확인
psql -U admin -h localhost -p 5432 -d resource-server -c "\dt"

# 데이터 건수 확인
psql -U admin -h localhost -p 5432 -d resource-server -c "SELECT COUNT(*) FROM documents;"
```

---

## 10. 보안 설정

### 10.1 JWT 토큰 관리

- **Secret Key**: 환경 변수로 관리 (`GLOBAL_SECRET`)
- **만료 시간**: 24시간 (환경 변수로 설정 가능)
- **알고리즘**: HS256 (기본값)

### 10.2 데이터베이스 보안

- 프로덕션 환경에서 SSL 연결 필수
- 강력한 비밀번호 사용
- 환경 변수로 민감 정보 관리

### 10.3 환경 변수 관리

- `.env` 파일은 `.gitignore`에 포함
- Vercel 환경 변수는 대시보드를 통해 관리
- 프로덕션 환경에서는 Vercel Secrets 사용

### 10.4 CORS 설정

```typescript
// main.ts
app.enableCors({
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
});
```

---

## 11. 트러블슈팅

### 11.1 일반적인 문제

#### 문제 1: 빌드 실패

```bash
# 로컬에서 빌드 테스트
npm run build

# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# TypeScript 컴파일 오류 확인
npx tsc --noEmit
```

#### 문제 2: 데이터베이스 연결 실패

```bash
# 연결 정보 확인
echo $POSTGRES_HOST
echo $POSTGRES_PORT
echo $POSTGRES_DB

# 연결 테스트
psql -U admin -h localhost -p 5432 -d resource-server
```

#### 문제 3: 마이그레이션 오류

```bash
# 마이그레이션 상태 확인
npm run typeorm -- migration:show

# 마이그레이션 롤백
npm run migration:revert

# 마이그레이션 재실행
npm run migration:run
```

#### 문제 4: Vercel 배포 실패

```bash
# 로컬 빌드 테스트
npm run vercel-build

# Vercel 로그 확인
vercel logs [deployment-url]

# 환경 변수 확인
vercel env ls
```

### 11.2 데이터 초기화

```bash
# 주의: 모든 데이터가 삭제됩니다
# 1. 데이터베이스 스키마 삭제
psql -U admin -h localhost -p 5432 -d resource-server -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 2. 마이그레이션 재실행
npm run migration:run
```

---

## 12. API 문서

### 12.1 Swagger 문서

개발 환경에서 Swagger UI 제공:

- **URL**: `http://localhost:3000/api/docs` (개발 환경)
- **설정**: `src/common/swagger/swagger.ts`

### 12.2 주요 엔드포인트

**인증**

- POST `/api/auth/login` - 로그인

**문서**

- GET `/api/document` - 문서 목록 조회
- GET `/api/document/:id` - 문서 상세 조회
- POST `/api/document` - 문서 생성
- PATCH `/api/document/:id` - 문서 수정
- DELETE `/api/document/:id` - 문서 삭제
- POST `/api/document/:id/submit` - 문서 상신

**템플릿**

- GET `/api/template` - 템플릿 목록 조회
- GET `/api/template/:id` - 템플릿 상세 조회
- POST `/api/template` - 템플릿 생성
- PATCH `/api/template/:id` - 템플릿 수정
- DELETE `/api/template/:id` - 템플릿 삭제

**결재 프로세스**

- POST `/api/approval-process/:documentId/approve` - 결재 승인
- POST `/api/approval-process/:documentId/reject` - 결재 반려
- POST `/api/approval-process/:documentId/execute` - 시행 처리

**메타데이터**

- GET `/api/metadata/category` - 카테고리 목록
- GET `/api/metadata/employee` - 직원 목록
- GET `/api/metadata/department` - 부서 목록

---

## 13. 전자결재 시스템 기능

### 13.1 문서 상태

| 문서상태       | 설명                                                 |
| -------------- | ---------------------------------------------------- |
| **임시저장**   | 기안자가 작성 중인 상태                              |
| **결재진행중** | 상신 완료 후 결재선에 따라 결재 단계가 진행되는 중   |
| **결재완료**   | 모든 합의·결재 단계 승인 완료                        |
| **반려**       | 어느 결재자/합의자라도 반려하면 문서 전체가 반려     |
| **시행완료**   | 모든 시행자가 시행 완료                              |
| **취소**       | 기안자가 상신취소 또는 결재취소로 문서를 취소한 상태 |

### 13.2 결재선 진행 순서

**합의 → 결재 → 시행 → 참조**

- **합의**: 순차 진행, 모두 승인되어야 결재 단계로 이동
- **결재**: 순차 진행, 모두 승인되어야 결재완료
- **시행**: 결재완료 후 진행, 모든 시행자가 처리해야 시행완료
- **참조**: 시행완료 후 열람 가능

### 13.3 수신자 역할

| 수신자 역할 | 행동 명칭       | 설명                                  |
| ----------- | --------------- | ------------------------------------- |
| **합의자**  | 합의(승인/반려) | 모든 합의 승인 후 결재자로 이동       |
| **결재자**  | 결재(승인/반려) | 모두 승인 시 문서상태 = 결재완료      |
| **시행자**  | 시행            | 모든 시행 완료 시 문서상태 = 시행완료 |
| **참조자**  | 열람            | 시행완료 후 문서를 확인               |

---

## 14. 유지보수 체크리스트

### 14.1 일일 체크

- [ ] Vercel 배포 상태 확인
- [ ] 헬스 체크 엔드포인트 정상 동작 확인
- [ ] 로그에 에러 없는지 확인
- [ ] 데이터베이스 연결 상태 확인

### 14.2 주간 체크

- [ ] 데이터베이스 백업 확인
- [ ] 로그 파일 정리
- [ ] 의존성 보안 업데이트 확인
- [ ] Vercel 사용량 확인

### 14.3 월간 체크

- [ ] 의존성 업데이트 검토
- [ ] 성능 모니터링 리뷰
- [ ] 백업 복원 테스트
- [ ] 코드 리뷰 및 리팩토링

---

## 15. 연락처 및 지원

### 15.1 개발팀 정보

- **프로젝트명**: LIAS (전자결재 시스템)
- **레포지토리**: Monorepo 구조
- **문의**: 시스템 관리자에게 문의

### 15.2 외부 서비스 의존성

- **Vercel**: 서버리스 배포 플랫폼
- **PostgreSQL**: 데이터베이스
- **AWS S3**: 파일 저장소
- **Firebase**: 푸시 알림 서비스
- **SSO 서비스**: 통합 인증 서비스

---

## 부록 A: 포트 매핑 전체 목록

| 서비스      | 개발 포트 | 프로덕션 포트 | 접근 |
| ----------- | --------- | ------------- | ---- |
| LIAS Server | 3000      | 5001          | 외부 |
| PostgreSQL  | 5432      | 6543 (SSL)    | 내부 |

---

## 부록 B: 서비스 의존성 다이어그램

```
[외부 요청]
    ↓
[LIAS Server:3000/5001] ← JWT 인증
    ↓
    ├─→ [PostgreSQL:5432/6543]
    ├─→ [AWS S3] (파일 저장)
    ├─→ [Firebase] (푸시 알림)
    └─→ [SSO Service] (인증)
```

---

## 부록 C: 모듈 구조

```
src/
├── common/                     # 공통 유틸리티
│   ├── auth/                  # 인증 모듈
│   ├── guards/                # 가드 (JWT, Role)
│   ├── interceptors/          # 인터셉터
│   ├── decorators/            # 데코레이터
│   ├── dtos/                  # 공통 DTO
│   ├── enums/                 # 열거형
│   └── utils/                 # 유틸리티 함수
│
├── modules/
│   ├── domain/                # 도메인 레이어
│   │   ├── document/          # 문서 도메인
│   │   ├── document-template/ # 템플릿 도메인
│   │   ├── approval-step-*/   # 결재 단계 도메인
│   │   ├── employee/         # 직원 도메인
│   │   ├── department/       # 부서 도메인
│   │   └── ...
│   │
│   ├── context/               # 컨텍스트 레이어
│   │   ├── document/          # 문서 컨텍스트
│   │   ├── template/          # 템플릿 컨텍스트
│   │   ├── approval-process/  # 결재 프로세스 컨텍스트
│   │   ├── notification/      # 알림 컨텍스트
│   │   └── ...
│   │
│   ├── business/             # 비즈니스 레이어
│   │   ├── document/          # 문서 비즈니스
│   │   ├── template/          # 템플릿 비즈니스
│   │   ├── approval-process/  # 결재 프로세스 비즈니스
│   │   ├── metadata/          # 메타데이터 비즈니스
│   │   └── auth/              # 인증 비즈니스
│   │
│   └── integrations/         # 외부 통합
│       ├── sso/               # SSO 통합
│       └── notification/      # 알림 통합
│
├── configs/                   # 설정 파일
│   ├── env.config.ts          # 환경 변수 설정
│   ├── typeorm.config.ts      # TypeORM 설정
│   └── jwt.config.ts          # JWT 설정
│
└── main.ts                     # 애플리케이션 진입점
```

---

**문서 버전**: 1.0  
**최종 수정일**: 2026년 1월 5일  
**작성자**: 김규현
