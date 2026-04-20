# 인프라 구성

## 개요

무모한 시식가 프로젝트의 배포 인프라 구성 문서.
도메인은 미구매 상태로, 각 서비스에서 제공하는 기본 도메인을 사용한다.

## 서비스 구성

| 항목               | 서비스             | URL                                     | 비용 |
| ------------------ | ------------------ | --------------------------------------- | ---- |
| 프론트엔드 (Astro) | Cloudflare Pages   | `https://fearless-tasting.pages.dev`    | 무료 |
| 백엔드 (NestJS)    | Render Web Service | `https://fearless-tasting.onrender.com` | 무료 |
| DB (MySQL 호환)    | TiDB Serverless    | Tokyo (ap-northeast-1)                  | 무료 |

## 프론트엔드 — Cloudflare Pages

- **URL**: `https://fearless-tasting.pages.dev`
- **빌드 설정**:
  - Framework preset: None
  - Build command: `pnpm --filter @repo/web build`
  - Build output directory: `apps/web/dist`
- **환경 변수**:
  - `PUBLIC_API_URL`: `https://fearless-tasting.onrender.com`
  - `PUBLIC_KAKAO_MAP_KEY`: 카카오맵 JavaScript 키 (선택)
- **배포 방식**: GitHub 연동, main push 시 자동 배포
- **HTTPS**: 자동 제공

## 백엔드 — Render Web Service

- **URL**: `https://fearless-tasting.onrender.com`
- **서비스 타입**: Web Service (무료 티어, Docker 빌드)
- **Dockerfile**: 프로젝트 루트 `Dockerfile`
- **배포 방식**: GitHub 연동, main push 시 자동 배포
- **환경 변수**:

| Key                   | 설명                                                        |
| --------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`        | TiDB 연결 문자열 (`mysql://...?sslaccept=strict`)           |
| `DATABASE_READER_URL` | TiDB 연결 문자열 (Writer와 동일)                            |
| `KAKAO_CLIENT_ID`     | 카카오 REST API 키                                          |
| `KAKAO_CLIENT_SECRET` | 카카오 Client Secret (선택)                                 |
| `KAKAO_CALLBACK_URL`  | `https://fearless-tasting.onrender.com/auth/kakao/callback` |
| `JWT_ACCESS_SECRET`   | 프로덕션용 랜덤 문자열                                      |
| `JWT_REFRESH_SECRET`  | 프로덕션용 랜덤 문자열                                      |
| `FRONTEND_URL`        | `https://fearless-tasting.pages.dev`                        |

- **주의사항**:
  - 무료 티어는 15분 미사용 시 슬립 (콜드 스타트 ~30초)
  - 유료 전환 시 월 $7

### Docker 배포 흐름

```dockerfile
# 빌드 단계 (이미지)
RUN pnpm --filter @repo/api exec prisma generate
RUN pnpm --filter @repo/api build

# 실행 시 (CMD)
prisma db push → node apps/api/dist/main
```

- `prisma db push`: 컨테이너 시작 시 스키마 동기화 (데이터 유지)
- `--accept-data-loss` 미사용: 위험한 스키마 변경 시 배포 실패로 안전 보장
- 스키마 변경 없는 배포에서는 "No changes"로 빠르게 통과

## DB — TiDB Serverless

- **서비스**: TiDB Cloud (https://tidbcloud.com/)
- **호환성**: MySQL 호환 (Prisma provider 변경 불필요)
- **무료 티어 제한**: 5GiB 스토리지, 50M Request Units/월
- **설정**:
  - Cluster Name: `fearless-tasting`
  - Region: Tokyo (ap-northeast-1)
- **연결**: 공용 엔드포인트 사용 (privatelink 아님), SSL 필수
- **연결 문자열 형식**:
  ```
  mysql://유저:비밀번호@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict
  ```
- **Reader/Writer 분리**: 미사용 (동일 URL, Prisma 코드의 read/write 구분은 유지)
- **Docker 이미지 요구사항**: `ca-certificates` 패키지 필수 (TLS 인증서 검증)

## 인증 아키텍처

크로스 도메인 환경(Cloudflare ↔ Render)에서 iOS Safari ITP가 서드파티 쿠키를 차단하므로
**Bearer 토큰 + localStorage** 방식을 사용한다.

| 항목      | 설명                                                                                       |
| --------- | ------------------------------------------------------------------------------------------ |
| 로그인    | 카카오 OAuth → 백엔드 콜백 → 프론트 `/login?access_token=...&refresh_token=...` 리다이렉트 |
| 토큰 저장 | `localStorage`에 `access_token`, `refresh_token` 저장                                      |
| API 요청  | `Authorization: Bearer {access_token}` 헤더로 전송                                         |
| 토큰 갱신 | 401 응답 시 `POST /auth/refresh` (body에 refreshToken) → 자동 갱신                         |
| 로그아웃  | `POST /auth/logout` + localStorage 토큰 삭제                                               |

> httpOnly 쿠키 방식은 iOS Safari에서 동작하지 않아 폐기.

## 카카오 OAuth 설정

카카오 개발자 콘솔에서 두 개의 Redirect URI 등록 필요:

- `http://localhost:4000/auth/kakao/callback` (로컬 개발)
- `https://fearless-tasting.onrender.com/auth/kakao/callback` (프로덕션)

## 배포 순서

1. TiDB Serverless 클러스터 생성 → 연결 문자열 확보
2. Render Web Service 생성 → 환경 변수 설정 → 백엔드 배포
3. 로컬에서 `prisma db push` (최초 1회, 이후 배포 시 자동)
4. Cloudflare Pages 환경 변수에 `PUBLIC_API_URL` 설정 → 프론트엔드 재배포
5. 카카오 개발자 콘솔에서 프로덕션 Redirect URI 추가

## 방 인원 제한

- 최대 멤버 수는 **방별 설정값** (`Room.maxMembers`, 범위 **2~20**, 기본 4)
- 위치: `apps/api/prisma/schema.prisma` (컬럼 정의) / `apps/api/src/rooms/rooms.service.ts` (체크 로직)
- 초과 시 403 응답: "방 인원이 가득 찼습니다 (최대 N명)"
- 방 생성/설정 API에서 조정 가능 (`CreateRoomDto.maxMembers`, `UpdateRoomDto.maxMembers`)

## 비용 요약

| 항목                           | 월 비용                       |
| ------------------------------ | ----------------------------- |
| Cloudflare Pages               | 무료                          |
| Render Web Service (무료 티어) | 무료                          |
| TiDB Serverless (무료 티어)    | 무료                          |
| 도메인                         | 미구매 (필요 시 ~12,000원/년) |
| **합계**                       | **무료**                      |

## 트러블슈팅 기록

| 문제                         | 원인                               | 해결                                     |
| ---------------------------- | ---------------------------------- | ---------------------------------------- |
| Cloudflare 빌드 실패         | `pnpm run build`가 API도 빌드 시도 | `pnpm --filter @repo/web build`으로 변경 |
| Render 시작 실패             | Dockerfile에 CMD 없음              | `CMD` 추가                               |
| TiDB 연결 실패 (P1001)       | privatelink URL 사용               | 공용 엔드포인트로 변경                   |
| TiDB SSL 실패 (P1011)        | Docker에 CA 인증서 없음            | `ca-certificates` 패키지 추가            |
| 500 on kakao callback        | DB 테이블 미생성                   | `prisma db push` 실행                    |
| iOS 로그인 미유지            | Safari ITP가 서드파티 쿠키 차단    | Bearer 토큰 + localStorage 방식으로 전환 |
| `prisma migrate deploy` 실패 | migrations 폴더 없음               | `prisma db push`로 변경                  |
