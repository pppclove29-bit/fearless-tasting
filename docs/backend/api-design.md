# API 설계 규칙

## REST 원칙

- 리소스 중심 URL: `/restaurants`, `/reviews`, `/users`
- 복수형 명사를 사용한다 (`/restaurant` X → `/restaurants` O)
- 동사 대신 HTTP 메서드로 행위를 표현한다

| HTTP 메서드 | 용도 | 예시 |
|-------------|------|------|
| GET | 조회 | `GET /restaurants` |
| POST | 생성 | `POST /restaurants` |
| PATCH | 부분 수정 | `PATCH /restaurants/:id` |
| DELETE | 삭제 | `DELETE /restaurants/:id` |

## 응답 코드

| 코드 | 의미 | 사용 시점 |
|------|------|-----------|
| 200 | 성공 | 조회, 수정, 삭제 성공 |
| 201 | 생성됨 | POST로 리소스 생성 성공 |
| 400 | 잘못된 요청 | DTO 유효성 검증 실패 |
| 401 | 인증 실패 | 토큰 없음/만료 |
| 403 | 권한 없음 | 접근 권한 부족 |
| 404 | 없음 | 리소스가 존재하지 않음 |
| 409 | 충돌 | 중복 데이터 |
| 500 | 서버 오류 | 예상치 못한 에러 |

## DTO 패턴

- `class-validator`로 유효성 검증한다
- 생성/수정 DTO를 분리한다 (`CreateXxxDto`, `UpdateXxxDto`)
- 응답 DTO가 필요하면 별도로 정의한다

```typescript
// create-restaurant.dto.ts
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsString()
  neighborhood: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
```

## URL 설계 예시

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/restaurants` | 식당 목록 |
| GET | `/restaurants/:id` | 식당 상세 |
| POST | `/restaurants` | 식당 등록 |
| PATCH | `/restaurants/:id` | 식당 수정 |
| DELETE | `/restaurants/:id` | 식당 삭제 |
| GET | `/restaurants/:id/reviews` | 특정 식당의 리뷰 목록 |
| POST | `/reviews` | 리뷰 작성 |
| GET | `/users/:id` | 사용자 조회 |
