# 환경 변수 가이드

---

## apps/api (백엔드)

### 데이터베이스

| 변수명 | 필수 | 설명 | 로컬 기본값 |
|--------|------|------|-------------|
| `DATABASE_URL` | O | MySQL Writer 접속 URL (쓰기용) | `mysql://app:app1234@localhost:3306/fearless_tasting` |
| `DATABASE_READER_URL` | X | MySQL Reader 접속 URL (읽기용). 미설정 시 `DATABASE_URL`을 사용 | `mysql://app:app1234@localhost:3307/fearless_tasting` |

### DATABASE_URL 형식

```
mysql://[사용자]:[비밀번호]@[호스트]:[포트]/[데이터베이스명]
```

### 카카오 OAuth

| 변수명 | 필수 | 설명 | 로컬 기본값 |
|--------|------|------|-------------|
| `KAKAO_CLIENT_ID` | O | 카카오 REST API 키 ([카카오 디벨로퍼](https://developers.kakao.com)에서 발급) | - |
| `KAKAO_CLIENT_SECRET` | O | 카카오 Client Secret | - |
| `KAKAO_CALLBACK_URL` | O | OAuth 콜백 URL. 카카오 앱 설정의 Redirect URI와 일치해야 함 | `http://localhost:4000/auth/kakao/callback` |

### JWT 인증

| 변수명 | 필수 | 설명 | 로컬 기본값 |
|--------|------|------|-------------|
| `JWT_ACCESS_SECRET` | O | Access Token 서명 시크릿 | `dev-access-secret-change-in-prod` |
| `JWT_REFRESH_SECRET` | O | Refresh Token 서명 시크릿 | `dev-refresh-secret-change-in-prod` |
| `FRONTEND_URL` | X | 프론트엔드 URL (CORS origin, OAuth 리다이렉트용) | `http://localhost:4321` |

### SMTP (문의 알림)

| 변수명 | 필수 | 설명 | 로컬 기본값 |
|--------|------|------|-------------|
| `SMTP_HOST` | X | SMTP 서버 호스트. 미설정 시 이메일 발송 스킵 | - |
| `SMTP_PORT` | X | SMTP 포트 | `587` |
| `SMTP_USER` | X | SMTP 인증 사용자 | - |
| `SMTP_PASS` | X | SMTP 인증 비밀번호 | - |
| `ADMIN_EMAIL` | X | 문의 알림 수신 이메일. 미설정 시 이메일 발송 스킵 | - |

> SMTP 환경변수는 모두 선택사항. 미설정 시 문의는 DB에만 저장되고 이메일 알림은 발송되지 않는다.

## apps/web (프론트엔드)

| 변수명 | 필수 | 설명 | 로컬 기본값 |
|--------|------|------|-------------|
| `PUBLIC_API_URL` | X | API 서버 주소. 미설정 시 `http://localhost:4000` | `http://localhost:4000` |

> Astro에서 클라이언트에 노출되는 환경변수는 반드시 `PUBLIC_` 접두사가 필요하다.

## Docker 환경 (docker-compose.yml)

Docker로 실행 시 환경변수가 `docker-compose.yml`에 이미 설정되어 있다. `.env` 파일 없이도 동작한다.

| 서비스 | 변수 | 값 |
|--------|------|----|
| api | `DATABASE_URL` | `mysql://app:app1234@mysql-writer:3306/fearless_tasting` |
| api | `DATABASE_READER_URL` | `mysql://app:app1234@mysql-reader:3306/fearless_tasting` |
| api | `KAKAO_CLIENT_ID` | `${KAKAO_CLIENT_ID}` (호스트 환경변수에서 주입) |
| api | `KAKAO_CLIENT_SECRET` | `${KAKAO_CLIENT_SECRET}` (호스트 환경변수에서 주입) |
| api | `KAKAO_CALLBACK_URL` | `http://localhost:4000/auth/kakao/callback` |
| api | `JWT_ACCESS_SECRET` | `${JWT_ACCESS_SECRET}` (기본값: `dev-access-secret-change-in-prod`) |
| api | `JWT_REFRESH_SECRET` | `${JWT_REFRESH_SECRET}` (기본값: `dev-refresh-secret-change-in-prod`) |
| api | `FRONTEND_URL` | `http://localhost:4321` |
| api | `SMTP_HOST` | `${SMTP_HOST}` (선택, 미설정 시 이메일 스킵) |
| api | `SMTP_PORT` | `${SMTP_PORT}` (기본값: `587`) |
| api | `SMTP_USER` | `${SMTP_USER}` (선택) |
| api | `SMTP_PASS` | `${SMTP_PASS}` (선택) |
| api | `ADMIN_EMAIL` | `${ADMIN_EMAIL}` (선택) |
| web | `PUBLIC_API_URL` | `http://localhost:4000` |
| mysql-writer | `MYSQL_ROOT_PASSWORD` | `root` |
| mysql-writer | `MYSQL_DATABASE` | `fearless_tasting` |
| mysql-writer | `MYSQL_USER` | `app` |
| mysql-writer | `MYSQL_PASSWORD` | `app1234` |

## 환경별 차이

| 환경 | DB 호스트 | Reader 분리 |
|------|-----------|-------------|
| 로컬 (Docker) | `mysql-writer` / `mysql-reader` | O (포트 3306/3307) |
| 로컬 (직접 실행) | `localhost` | 선택 (같은 DB 사용 가능) |
| 프로덕션 | 별도 DB 서버 | O (별도 Read Replica) |

## 주의사항

- `.env` 파일은 **절대 Git에 커밋하지 않는다**
- 새로운 환경변수 추가 시 `.env.example`을 반드시 갱신한다
- 비밀번호는 로컬 개발용으로만 사용. 프로덕션에서는 별도 시크릿 관리
