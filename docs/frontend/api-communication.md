# API 통신 규칙

## API 클라이언트

- API 호출은 `src/lib/api.ts`에 모아서 관리한다
- `fetch`를 사용하며, 공통 base URL을 환경 변수에서 가져온다
- 응답 실패 시 에러를 throw한다

```typescript
// src/lib/api.ts
const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchRestaurants() {
  const res = await fetch(`${API_BASE}/restaurants`);
  if (!res.ok) throw new Error('Failed to fetch restaurants');
  return res.json();
}
```

## 환경 변수

- 클라이언트에서 접근 가능한 변수는 `PUBLIC_` 접두사를 붙인다
- `.env.example`에 필요한 변수를 문서화한다

```env
# apps/web/.env.example
PUBLIC_API_URL=http://localhost:4000
```
