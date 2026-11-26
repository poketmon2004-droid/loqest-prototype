# LOQEST (로케스트)

## 1. 프로젝트 개요

LOQEST는 별도의 앱 설치 없이 모바일 웹에서 관광지 방문 인증과 스탬프 투어를 경험할 수 있는 Zero-Device 기반 관광 퀘스트 서비스입니다.

GPS 위치 인증, 손동작 인식, 랜드마크 이미지 인식을 활용하여 관광객의 현장 참여를 유도하며, 관리자가 관광 투어와 퀘스트를 직접 구성하고 운영할 수 있도록 개발되었습니다.

현재 버전은 기능 검증 및 서비스 시연을 위한 프로토타입이며, 향후 T-COUPON 관광쿠폰 시스템과의 연계를 고려하고 있습니다.

## 2. 주요 기능

### 관광객 서비스

- 앱 설치 및 회원가입 없는 웹 기반 참여
- 지역별 관광 투어 및 퀘스트 선택
- 카메라 및 위치정보 사용 권한 안내
- 손동작 인식을 통한 촬영 활성화
- GPS 기반 관광지 방문 인증
- 촬영 가이드 기반 랜드마크 이미지 인증
- 퀘스트별 스탬프 획득
- 투어 진행률 및 완주 배지 확인
- 비로그인 참여 세션 및 서버 기반 스탬프 기록
- 일회용 이전 링크를 활용한 브라우저 간 참여 기록 연계
- 서비스 체험용 테스트 투어

### 관리자 서비스

- 투어 등록, 수정 및 공개 상태 관리
- 관광지 및 퀘스트 등록·수정·삭제
- GPS 좌표 및 인증 반경 설정
- 랜드마크 기준 이미지 등록
- 대표 이미지 설정
- 이미지 인식 기준 설정
- 촬영 가이드 모양 설정
- 랜드마크 인식 테스트 및 승인 관리
- 퀘스트 공개 상태 관리
- 운영 대시보드
- 관광객 참여 및 인증 시도 기록 조회

## 3. 서비스 이용 흐름

### 관광객

투어 선택 → 권한 설정 → 퀘스트 선택 → 손동작 인식 → GPS 위치 인증 → 랜드마크 촬영 및 인식 → 스탬프 획득 → 투어 완주

### 관리자

투어 등록 → 퀘스트 등록 → 기준 이미지 및 인증 조건 설정 → 이미지 인식 테스트 → 승인 및 공개 → 운영 현황 확인

## 4. 기술 스택

| 구분 | 기술 |
|---|---|
| Framework | Next.js 16.2.12 (App Router) |
| Language | TypeScript |
| UI | React 19.2.4, CSS Modules |
| Backend | Next.js Route Handlers |
| Database | Supabase PostgreSQL |
| File Storage | Supabase Storage |
| Landmark Recognition | OpenCV.js (ORB 특징점 기반 이미지 비교) |
| Gesture Recognition | MediaPipe Gesture Recognizer |
| Location | Web Geolocation API |
| Camera | Web MediaDevices API |
| Client Storage | localStorage |
| Session Management | Cookie 기반 비로그인 참여 세션 |
| Deployment | Vercel |
| Version Control | Git / GitHub |

## 5. 프로젝트 구조

```text
loqest-prototype/
├── app/
│   ├── admin/              # 관리자 서비스
│   ├── api/                # 서버 API
│   ├── continue/           # 브라우저 간 참여 기록 이전
│   ├── landmark-test/      # 랜드마크 인식 테스트
│   ├── page.tsx            # 관광객 서비스 진입점
│   └── layout.tsx
├── components/             # 화면 및 공통 UI 컴포넌트
├── lib/                    # DB 연결, 세션 및 공통 기능
├── public/
│   ├── landmarks/          # 기존 테스트용 기준 이미지
│   ├── mediapipe-wasm/     # 손동작 인식 실행 파일
│   └── models/             # 손동작 인식 모델
├── scripts/                # DB 초기 설정 및 이미지 관리 스크립트
├── supabase/
│   └── migrations/         # DB 생성 및 변경 SQL
├── docs/                   # 기술 및 연동 설계 문서
├── package.json
└── README.md
```

## 6. 데이터베이스 구성

현재 Supabase의 public 스키마는 9개 테이블로 구성되어 있습니다.

| 테이블 | 설명 |
|---|---|
| tours | 관광 투어 기본 정보 및 공개 상태 |
| attractions | 관광지, 퀘스트 및 인증 조건 |
| attraction_reference_images | 랜드마크 기준 이미지 및 대표 이미지 |
| capture_records | 관광객의 인증 시도 및 결과 |
| recognition_test_records | 관리자 인식 테스트 승인 상태 |
| visitor_sessions | 비로그인 관광객 참여 세션 |
| visitor_stamps | 세션별 스탬프 획득 기록 |
| visitor_session_tokens | 브라우저별 참여 세션 연결 |
| visitor_transfer_codes | 일회용 참여 기록 이전 코드 |

### 주요 데이터 관리 규칙

- 하나의 투어에 여러 퀘스트를 등록할 수 있습니다.
- 하나의 퀘스트에 여러 기준 이미지를 등록할 수 있습니다.
- 동일한 참여 세션에서 동일한 퀘스트의 스탬프가 중복 저장되지 않도록 제한합니다.
- 퀘스트의 GPS 인증 반경은 양수로 제한합니다.
- 브라우저 이전 코드의 만료 시간은 생성 시간보다 늦도록 제한합니다.
- 현재 스탬프 인증 근거는 client_reported로 관리합니다.

### DB 초기화 관련 참고사항

DB 생성 및 변경 SQL은 scripts/ 및 supabase/migrations/에 일부 포함되어 있습니다.

다만 초기 구축 과정에서 Supabase에 직접 적용된 테이블 생성 SQL 및 설정이 모두 저장소에 포함되어 있는 것은 아닙니다.

신규 DB 구축 시 전체 스키마, 인덱스, 접근 권한, RLS 정책, DB 함수 및 Storage 설정에 대한 추가 확인이 필요합니다.

## 7. API 구성

| API 경로 | HTTP Method | 주요 역할 |
|---|---|---|
| /api/tours | GET, POST | 투어 조회 및 등록 |
| /api/tours/[id] | GET, PUT, PATCH, DELETE | 개별 투어 조회 및 관리 |
| /api/attractions | GET, POST | 퀘스트 조회 및 등록 |
| /api/attractions/[id] | GET, PUT, DELETE | 개별 퀘스트 조회 및 관리 |
| /api/capture-records | GET, POST | 인증 기록 조회 및 저장 |
| /api/recognition-test-records | GET, POST | 인식 테스트 승인 정보 조회 및 저장 |
| /api/participation | GET, POST, DELETE | 관광객 참여 세션 및 진행 기록 관리 |
| /api/participation/summary | GET | 투어 참여 진행률 및 완주 여부 조회 |
| /api/participation/transfer | POST, PUT | 브라우저 간 참여 기록 이전 |

## 8. 로컬 실행 방법

### 의존성 설치

```bash
npm ci
```

### 환경변수 설정

프로젝트 최상위 경로에 .env.local 파일을 생성합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

기존 DB 및 Storage 설정과 연결 가능한 Supabase 프로젝트가 필요합니다.

SUPABASE_SERVICE_ROLE_KEY는 서버 전용 환경변수이며, 외부에 공개하거나 GitHub에 업로드하지 않습니다.

### 개발 서버 실행

```bash
npm run dev
```

- 관광객 서비스: http://localhost:3000
- 관리자 서비스: http://localhost:3000/admin

### 코드 검사 및 빌드

```bash
npm run lint
npm run build
```

### 빌드된 서비스 실행

```bash
npm run start
```

모바일 기기에서 카메라 및 위치정보 기능을 이용하려면 브라우저의 권한 허용과 HTTPS 등 보안 컨텍스트가 필요합니다.

## 9. T-COUPON 연동 현황

현재 LOQEST는 T-COUPON과의 향후 연계를 고려하여 비로그인 관광객 참여 세션과 서버 기반 스탬프 기록 조회 기능을 구현하였습니다.

### 구현 범위

- 관광객 참여 세션 식별
- 투어별 스탬프 획득 기록 저장
- 완료 퀘스트 및 전체 진행률 조회
- 투어 완주 여부 조회
- 쿠폰 연동을 고려한 참여 정보 요약 API

### 미구현 범위

- T-COUPON 사용자 계정 연계
- 서버 기반 쿠폰 지급 자격 검증
- 쿠폰 발급 및 지급 처리
- 쿠폰 중복 발급 방지 및 정산 연계

현재 참여 정보 요약 API는 정보성 조회를 목적으로 하며, 실제 쿠폰 발급 기능을 제공하지 않습니다.

```text
verification.status = client_reported
verification.eligibleForCoupon = false
coupon.integrationStatus = not_connected
coupon.issuanceEnabled = false
```

세부 연동 방향 및 보안 요구사항은 다음 문서를 참고합니다.

- docs/tcoupon-integration-plan.md

## 10. 현재 개발 범위 및 향후 과제

현재 버전은 관광 퀘스트 서비스의 사용자 경험, 관리자 운영 흐름, 이미지 인식 기술 및 데이터 관리 구조를 검증하기 위한 프로토타입입니다.

실제 서비스 전환 시 다음 사항에 대한 추가 설계 및 개발이 필요합니다.

| 구분 | 향후 개발 과제 |
|---|---|
| 관리자 인증 | 임시 관리자 접근 방식을 정식 인증 및 권한 관리로 전환 |
| 관광객 인증 | 브라우저 기반 인증 결과에 대한 서버 검증 및 부정 참여 방지 |
| 이미지 인식 | 다양한 현장 환경에서의 인식 정확도 및 성능 검증 |
| 데이터베이스 | 전체 스키마 및 접근 권한 정비 |
| 서버 인프라 | 실제 운영 환경에 적합한 서버 및 DB 구축 |
| 쿠폰 연동 | T-COUPON 사용자 식별, 지급 조건 및 발급 처리 연계 |
| 운영 관리 | 로그, 모니터링, 백업 및 장애 대응 체계 구축 |
| 개인정보 | 위치정보, 참여 기록 및 관련 데이터의 관리 정책 수립 |

상용 서비스의 최종 인증 방식, 서버 구성 및 T-COUPON 통합 구조는 실제 사업 요구사항에 따라 별도로 확정합니다.

## 11. 배포 환경

현재 프로토타입은 Vercel 및 Supabase를 기반으로 배포되어 있습니다.

- 관광객 서비스: https://loqest-prototype.vercel.app
- 관리자 서비스: https://loqest-prototype.vercel.app/admin

현재 배포 환경은 개발 및 기능 검증용이며, 실제 운영 환경과는 구분합니다.