# API 통신 규칙

## API 클라이언트

- API 호출은 `src/lib/api.ts`에 모아서 관리한다
- `apiFetch` 래퍼 함수로 모든 요청에 `credentials: 'include'`를 포함한다 (쿠키 기반 인증)
- 공통 base URL은 환경 변수에서 가져온다
- 응답 실패 시 에러를 throw한다

```typescript
// src/lib/api.ts
const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

/** credentials: 'include' 기본 포함 fetch 래퍼 */
function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { credentials: 'include', ...init });
}

export async function fetchRestaurants(...) {
  const res = await apiFetch(`${API_BASE}/restaurants?${params}`);
  if (!res.ok) return [];
  return res.json();
}
```

## 인증 관련 API

```typescript
// 현재 로그인 유저 조회 (비로그인 시 null)
export async function fetchCurrentUser(): Promise<AuthUser | null>

// 토큰 갱신
export async function refreshToken(): Promise<boolean>

// 로그아웃
export async function logout(): Promise<void>
```

- `fetchCurrentUser()`로 로그인 상태를 확인한다 (BaseLayout 네비게이션, 폼 제출 전 등)
- 인증이 필요한 POST 요청은 서버에서 쿠키의 JWT를 자동으로 검증한다

## 환경 변수

- 클라이언트에서 접근 가능한 변수는 `PUBLIC_` 접두사를 붙인다
- `.env.example`에 필요한 변수를 문서화한다

```env
# apps/web/.env.example
PUBLIC_API_URL=http://localhost:4000
```
