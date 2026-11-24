# LOQEST ↔ T-COUPON 연동 준비 (2026-11-24)

## 확정된 사용자 경험
- 관광지 입장 시 관광객에게 **같은 공통 URL** 전달
- LOQEST 스탬프 투어는 **로그인 없이** 이용
- 브라우저마다 서버 측 익명 참여 세션을 발급하고 스탬프 진행 기록 저장
- 쿠폰 지급 조건/금액/기한/로그인 요구 여부는 **미정**: 현재 발급하지 않음

## 현재 코드에서 확인한 데이터
**LOQEST** (Next.js + Supabase PostgreSQL)
- `visitor_sessions.id`: 익명 브라우저의 참여 세션
- `visitor_stamps`: `session_id`, `tour_id`, `attraction_id`, `evidence='client_reported'`
- `capture_records`: 촬영 로그 (`visitor_id`, `session_id`, `result`, `stage` 등)
- `GET /api/participation/summary?tourId=...`: 같은 브라우저의 조회 전용 참여 요약. `eligibleForCoupon: false` 고정

**T-COUPON** (첨부된 `T-COUPON-main(1).zip`)
- `backend/src/middleware/auth.js`: Bearer JWT의 `req.user.id` 및 `tourist` 권한
- `backend/src/routes/auth.js`: `GET /me` 및 관광객 로그인/휴대폰 본인 인증
- `backend/src/routes/coupon.js`: `GET /my`, `POST /issue-by-qr`, `POST /register-paper`
- 현재 `/my`, `/issue-by-qr`, `/register-paper` 등은 로그인 인증 필요
- 기존 QR 쿠폰 발급 API는 발행처 배정/계정 기준 중복 검사에 특화되어 있어 완주 보상 API로 직접 재사용하면 안 됨

## 다음 연동에 필요한 것 (아직 구현하지 않음)
1. **신뢰할 수 있는 인증 증빙:** 현재 GPS/손동작/이미지 비교와 `capture_records` 값은 브라우저에서 계산/제출됨. 서버 재검증이 없으므로 쿠폰의 발급 근거로 활용 금지.
2. **보상 정책 데이터:** 행사별 지급 조건/횟수/유효기간/금액 등 운영 정책이 확정되면 별도 설정으로 관리.
3. **사용자 연결 프로토콜:** 정책상 로그인 필요 시 T-COUPON에서 로그인 후 본인 ID를 획득하고, 일회용 짧은 수명의 교환 코드를 서버끼리 교환. LOQEST의 익명 쿠키/세션 ID만으로 T-COUPON 사용자라고 간주하지 않음.
4. **원자적 발급/멱등성:** 발급 내역에 고유 행사·투어·자격·수령자를 기록하고 중복 요청에도 쿠폰 하나만 발급되도록 DB 제약 및 트랜잭션 사용.
5. **서버 간 인증:** 브라우저에 T-COUPON 관리자/발급용 인증키를 절대 노출하지 않음. 기존 프론트엔드 쿠폰 엔드포인트를 서버에서 사용자 인증 없이 호출하지 않음.
6. **배포 및 도메인 정책:** LOQEST와 T-COUPON은 별도 origin이므로 공통 브라우저 쿠키를 가정하지 않음.

## 현재 API 응답 예
```json
{
  "tourId": "example",
  "participationId": "server-side-session-id-or-null",
  "progress": {
    "completedAttractionIds": [],
    "completedCount": 0,
    "questCount": 3,
    "allQuestsCompleted": false
  },
  "verification": {
    "status": "client_reported",
    "eligibleForCoupon": false,
    "reason": "..."
  },
  "coupon": { "integrationStatus": "not_connected", "issuanceEnabled": false }
}
```

> 이 요약 API는 방문자 화면과 내부 연동 설계를 위한 **정보성 조회**이다. 다른 사용자의 진행률을 조회하거나 실제 쿠폰을 발급하는 API가 아니다.
