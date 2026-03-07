# 인프라 구성

## 개요

무모한 시식가 프로젝트의 배포 인프라 구성 문서.
도메인은 미구매 상태로, 각 서비스에서 제공하는 기본 도메인을 사용한다.

## 서비스 구성

| 항목 | 서비스 | 비용 | 상태 |
|------|--------|------|------|
| 프론트엔드 (Astro) | Cloudflare Pages | 무료 | 완료 |
| 백엔드 (NestJS) | Render Web Service | 무료 | 미완료 |
| DB (MySQL 8.0) | TiDB Serverless | 무료 | 미완료 |

## 프론트엔드 — Cloudflare Pages

- **URL**: `https://fearless-tasting.pages.dev` (프로젝트명에 따라 다를 수 있음)
- **빌드 설정**:
  - Root directory: `apps/web`
  - Build command: `pnpm --filter @repo/web build`
  - Build output directory: `dist`
- **환경 변수**:
  - `PUBLIC_API_URL`: Render 백엔드 URL (백엔드 배포 후 설정)
  - `PUBLIC_KAKAO_MAP_KEY`: 카카오맵 JavaScript 키 (선택)
- **배포 방식**: GitHub 연동, push 시 자동 배포
- **HTTPS**: 자동 제공

## 백엔드 — Render Web Service

- **URL**: `https://{서비스명}.onrender.com` (생성 후 확정)
- **서비스 타입**: Web Service (무료 티어)
- **빌드/배포**: Docker 또는 Node.js 환경
- **환경 변수**:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | TiDB 연결 문자열 |
| `DATABASE_READER_URL` | TiDB 연결 문자열 (Writer와 동일) |
| `KAKAO_CLIENT_ID` | 카카오 개발자 콘솔에서 발급 |
| `KAKAO_CLIENT_SECRET` | 카카오 개발자 콘솔에서 발급 |
| `KAKAO_CALLBACK_URL` | `https://{백엔드URL}.onrender.com/auth/kakao/callback` |
| `JWT_ACCESS_SECRET` | 프로덕션용 랜덤 문자열 |
| `JWT_REFRESH_SECRET` | 프로덕션용 랜덤 문자열 |
| `FRONTEND_URL` | Cloudflare Pages URL |

- **주의사항**:
  - 무료 티어는 15분 미사용 시 슬립 (콜드 스타트 ~30초)
  - 유료 전환 시 월 $7

## DB — TiDB Serverless

- **서비스**: TiDB Cloud (https://tidbcloud.com/)
- **호환성**: MySQL 호환 (Prisma provider 변경 불필요)
- **무료 티어 제한**: 5GiB 스토리지, 50M Request Units/월
- **설정**:
  - Cluster Name: `fearless-tasting`
  - Region: Tokyo (ap-northeast-1) 권장
- **연결 문자열 형식**:
  ```
  mysql://유저:비밀번호@호스트:4000/fearless_tasting?ssl={"rejectUnauthorized":true}
  ```
- **Reader/Writer 분리**: 미사용 (단일 연결 문자열로 통합)

## 카카오 OAuth 설정 변경

배포 시 카카오 개발자 콘솔에서 Redirect URI를 추가해야 한다.

- **기존**: `http://localhost:4000/auth/kakao/callback`
- **추가**: `https://{백엔드URL}.onrender.com/auth/kakao/callback`

## 배포 순서

1. TiDB Serverless 클러스터 생성 → 연결 문자열 확보
2. Render Web Service 생성 → 환경 변수 설정 → 백엔드 배포
3. Cloudflare Pages 환경 변수에 `PUBLIC_API_URL` 설정 → 프론트엔드 재배포
4. 카카오 개발자 콘솔에서 Redirect URI 추가

## 비용 요약

| 항목 | 월 비용 |
|------|---------|
| Cloudflare Pages | 무료 |
| Render Web Service (무료 티어) | 무료 |
| TiDB Serverless (무료 티어) | 무료 |
| 도메인 | 미구매 (필요 시 ~12,000원/년) |
| **합계** | **무료** |
