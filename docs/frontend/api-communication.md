# API 통신 규칙

## API 클라이언트

- API 호출은 `src/lib/api.ts`에 모아서 관리한다
- `apiFetch()` 래퍼 함수를 통해 모든 요청에 `Authorization: Bearer <AT>` 헤더를 자동 첨부한다
- `credentials: 'omit'` — 쿠키 전송 없음 (Bearer 헤더 방식)
- 공통 base URL은 환경 변수에서 가져온다
- 응답 실패 시 `throwIfNotOk(res, fallback)` 헬퍼로 에러를 throw한다

```typescript
// src/lib/api.ts (핵심 구조)
const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

/** 응답 실패 시 서버 에러 메시지를 추출하여 throw */
async function throwIfNotOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => null);
  throw new Error(body?.message || fallback);
}

/** AT 자동 첨부 + 선제 갱신 + 401 시 재시도 */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  // AT 만료 1분 전이면 선제적으로 갱신
  if (isTokenExpiringSoon() && getRefreshToken()) {
    await refreshTokens();
  }

  const token = getAccessToken();
  const headers: Record<string, string> = { ...(init?.headers ?? {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(url, { ...init, headers, credentials: 'omit' });

  // 401 → RT로 1회 재시도
  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()!}`;
      res = await fetch(url, { ...init, headers, credentials: 'omit' });
    }
  }
  return res;
}
```

## 토큰 관리

### 저장소

- Access Token: `localStorage.getItem('access_token')`
- Refresh Token: `localStorage.getItem('refresh_token')`

### 주요 함수

```typescript
getAccessToken(): string | null      // localStorage에서 AT 반환
getRefreshToken(): string | null     // localStorage에서 RT 반환
saveTokens(at, rt): void             // localStorage에 저장
clearTokens(): void                  // localStorage 삭제 (로그아웃/인증 실패 시)
```

### 선제 갱신 (Proactive Refresh)

- `apiFetch()` 호출 시 AT의 JWT `exp`를 디코딩하여 **만료 1분 전**이면 자동으로 RT로 갱신 후 요청 진행
- 동시 401 발생 시 **refresh mutex**로 갱신 요청을 1회만 실행 (중복 방지)

### 401 처리 흐름

```
apiFetch() → 401 응답
  └─ RT 존재?
       ├─ Yes → refreshTokens() → 성공 시 원래 요청 재시도
       │                        → 실패 시 clearTokens() + /login 리다이렉트
       └─ No  → clearTokens() + /login 리다이렉트
```

## 인증 관련 API

```typescript
// 현재 로그인 유저 조회 (비로그인 시 null)
export async function fetchCurrentUser(): Promise<AuthUser | null>

// 토큰 갱신 (body에 refreshToken 전송)
export async function refreshTokens(): Promise<boolean>

// 로그아웃 (서버 DB RT 무효화는 fire-and-forget)
export async function logout(): Promise<void>
```

- `fetchCurrentUser()`: 같은 페이지 내 중복 호출 방지 캐시 내장. View Transitions 전환 시 `resetUserCache()` 호출 필요
- `logout()`: 즉시 `clearTokens()` 실행 후 `POST /auth/logout` 비동기 처리

## 에러 처리 패턴

```typescript
// throwIfNotOk 헬퍼 사용
const res = await apiFetch(`${API_BASE}/rooms`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name }),
});
await throwIfNotOk(res, '방 생성에 실패했습니다');
return res.json();
```

- API 에러 처리는 항상 `throwIfNotOk(res, fallback)` 헬퍼를 사용한다
- fallback 메시지는 사용자에게 표시되는 한국어 문장으로 작성한다

## 환경 변수

- 클라이언트에서 접근 가능한 변수는 `PUBLIC_` 접두사를 붙인다
- `.env.example`에 필요한 변수를 문서화한다

```env
# apps/web/.env.example
PUBLIC_API_URL=http://localhost:4000
PUBLIC_KAKAO_MAP_KEY=
PUBLIC_AD_CLIENT=
SITE_URL=https://fearless-tasting.pages.dev
```
