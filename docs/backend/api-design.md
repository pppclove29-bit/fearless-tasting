# API 설계 규칙

## REST 원칙

- 리소스 중심 URL: `/rooms`, `/users`, `/inquiries`
- 복수형 명사를 사용한다 (`/room` X → `/rooms` O)
- 동사 대신 HTTP 메서드로 행위를 표현한다
- 방 하위 리소스는 중첩 경로로 표현한다 (`/rooms/:id/restaurants`, `/rooms/:id/restaurants/:rid/visits`)

| HTTP 메서드 | 용도 | 예시 |
|-------------|------|------|
| GET | 조회 | `GET /rooms/:id/restaurants` |
| POST | 생성 | `POST /rooms/:id/restaurants` |
| PATCH | 부분 수정 | `PATCH /rooms/:id/restaurants/:rid` |
| DELETE | 삭제 | `DELETE /rooms/:id/restaurants/:rid` |

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
// create-room-restaurant.dto.ts
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateRoomRestaurantDto {
  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  waitTime?: number;
}
```

## URL 설계 예시

### 방 (Rooms)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| POST | `/rooms` | O | 방 생성 |
| POST | `/rooms/join` | O | 초대 코드로 방 입장 |
| GET | `/rooms/:id` | O | 방 상세 조회 |
| DELETE | `/rooms/:id` | O | 방 삭제 (owner) |

### 방 식당 (Room Restaurants)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/rooms/:id/restaurants` | O | 방 내 식당 목록 |
| POST | `/rooms/:id/restaurants` | O | 방 내 식당 등록 |
| PATCH | `/rooms/:id/restaurants/:rid` | O | 방 내 식당 수정 |
| DELETE | `/rooms/:id/restaurants/:rid` | O | 방 내 식당 삭제 |

### 방문 (Visits)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| POST | `/rooms/:id/restaurants/:rid/visits` | O | 방문 기록 생성 |
| GET | `/rooms/:id/visits/:visitId` | O | 방문 상세 조회 |
| DELETE | `/rooms/:id/visits/:visitId` | O | 방문 기록 삭제 |

### 리뷰 (Reviews)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| POST | `/rooms/:id/visits/:visitId/reviews` | O | 방문별 리뷰 작성 |
| PATCH | `/rooms/:id/reviews/:reviewId` | O | 리뷰 수정 |
| DELETE | `/rooms/:id/reviews/:reviewId` | O | 리뷰 삭제 |

### 사용자 (Users)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/users/:id` | X | 사용자 조회 |

### 문의 (Inquiries)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| POST | `/inquiries` | X | 문의 등록 (지역 추가 요청, 버그 신고, 피드백 등) |
| GET | `/inquiries` | O | 문의 목록 조회 (관리자용) |

### 인증 (Auth)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/auth/kakao` | X | 카카오 OAuth 시작 (302 리다이렉트) |
| GET | `/auth/kakao/callback` | X | 카카오 콜백 → JWT 발급 → 프론트 리다이렉트 |
| GET | `/auth/me` | O | 현재 로그인 유저 정보 |
| POST | `/auth/refresh` | X | Refresh Token으로 Access Token 갱신 |
| POST | `/auth/logout` | O | 로그아웃 (쿠키 삭제 + DB RT 무효화) |
