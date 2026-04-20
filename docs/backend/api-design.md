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
| 429 | 요청 초과 | Rate Limit 초과 |
| 500 | 서버 오류 | 예상치 못한 에러 |

## DTO 패턴

- `class-validator`로 유효성 검증한다
- 생성/수정 DTO를 분리한다 (`CreateXxxDto`, `UpdateXxxDto`)
- DTO 프로퍼티에는 `!` (definite assignment assertion)을 사용한다
- 정수 검증은 반드시 `@IsInt()`를 사용한다 (`@IsNumber()` 금지 — 소수점 허용 방지)
- 응답 DTO가 필요하면 별도로 정의한다

```typescript
// create-room-restaurant.dto.ts
import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateRoomRestaurantDto {
  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsBoolean()
  isWishlist?: boolean;
}
```

## URL 설계 예시

### 인증 (Auth)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/auth/kakao` | X | 카카오 OAuth 시작 (302 리다이렉트) |
| GET | `/auth/kakao/callback` | X | 카카오 콜백 → JWT 발급 → 프론트 리다이렉트 |
| GET | `/auth/naver` | X | 네이버 OAuth 시작 (302 리다이렉트) |
| GET | `/auth/naver/callback` | X | 네이버 콜백 → JWT 발급 → 프론트 리다이렉트 |
| GET | `/auth/me` | O | 현재 로그인 유저 정보 |
| POST | `/auth/refresh` | X | Refresh Token으로 Access Token 갱신 |
| POST | `/auth/logout` | O | 로그아웃 (쿠키 삭제 + DB RT 무효화) |

### 방 (Rooms)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| POST | `/rooms` | O | 방 생성 |
| GET | `/rooms` | O | 내 방 목록 |
| POST | `/rooms/join` | O | 초대 코드로 방 입장 |
| GET | `/rooms/platform-stats` | X | 플랫폼 공개 통계 |
| GET | `/rooms/discover` | X | 공개 맛집 추천 리스트 |
| GET | `/rooms/public` | X | 공개 방 목록 |
| GET | `/rooms/public/sitemap-ids` | X | 공개 방 ID 목록 (sitemap용) |
| GET | `/rooms/public/:id` | X | 공개 방 상세 |
| GET | `/rooms/public/:id/restaurants/:rid` | X | 공개 방 식당 상세 |
| GET | `/rooms/:id` | O (RoomMember) | 방 상세 조회 |
| PATCH | `/rooms/:id` | O | 방 설정 수정 (이름·탭 설정 등, 방장만) |
| DELETE | `/rooms/:id` | O | 방 삭제 (방장만) |
| PATCH | `/rooms/:id/invite-code` | O | 초대 코드 재생성 (방장만) |
| PATCH | `/rooms/:id/public` | O | 공개 방 설정 (방장만) |
| GET | `/rooms/:id/stats` | O (RoomMember) | 방 통계 조회 |
| GET | `/rooms/:id/timeline` | O (RoomMember) | 방 활동 타임라인 |
| PATCH | `/rooms/:id/members/:userId` | O | 멤버 역할 변경 (방장만) |
| DELETE | `/rooms/:id/members/:userId` | O | 멤버 강퇴 (방장만) |
| PATCH | `/rooms/:id/transfer/:userId` | O | 방장 위임 (방장만) |
| POST | `/rooms/:id/leave` | O (RoomMember) | 방 나가기 |

### 방 식당 (Room Restaurants)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/rooms/:id/restaurants` | O (RoomMember) | 방 내 식당 목록 (페이지네이션, 검색, 필터) |
| POST | `/rooms/:id/restaurants` | O (RoomMember) | 방 내 식당 등록 |
| POST | `/rooms/:id/restaurants/from-community` | O (RoomMember) | 커뮤니티 게시글에서 식당 추가 |
| GET | `/rooms/:id/restaurants/:rid` | O (RoomMember) | 방 내 식당 상세 (리뷰 포함) |
| PATCH | `/rooms/:id/restaurants/:rid` | O (RoomMember) | 방 내 식당 수정 (본인 또는 매니저+) |
| DELETE | `/rooms/:id/restaurants/:rid` | O (RoomMember) | 방 내 식당 삭제 (본인 또는 매니저+) |
| POST | `/rooms/:id/restaurants/:rid/wishlist` | O (RoomMember) | 위시리스트 토글 |
| GET | `/rooms/:id/restaurants/:rid/compare` | O (RoomMember) | 멤버별 리뷰 비교 |

### 방문 (Visits)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| POST | `/rooms/:id/restaurants/:rid/visits` | O (RoomMember) | 방문 기록 생성 |
| PATCH | `/rooms/:id/visits/:visitId` | O (RoomMember) | 방문 기록 수정 (생성자 또는 매니저+) |
| DELETE | `/rooms/:id/visits/:visitId` | O (RoomMember) | 방문 기록 삭제 (생성자 또는 매니저+) |

### 리뷰 (Reviews)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| POST | `/rooms/:id/visits/:visitId/reviews` | O (RoomMember) | 방문별 리뷰 작성 (방문당 1인 1리뷰) |
| PATCH | `/rooms/:id/reviews/:revId` | O (RoomMember) | 리뷰 수정 (본인만) |
| DELETE | `/rooms/:id/reviews/:revId` | O (RoomMember) | 리뷰 삭제 (본인 또는 매니저+) |

### 투표 (Polls)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/rooms/:id/polls` | O (RoomMember) | 투표 목록 조회 |
| POST | `/rooms/:id/polls` | O (RoomMember) | 투표 생성 |
| POST | `/rooms/:id/polls/:pollId/vote` | O (RoomMember) | 투표 참여 |
| PATCH | `/rooms/:id/polls/:pollId/close` | O (RoomMember) | 투표 마감 (생성자만) |

### 사용자 (Users)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/users` | X | 사용자 목록 조회 |
| PATCH | `/users/me` | O | 내 닉네임/프로필 수정 |
| DELETE | `/users/me` | O | 회원 탈퇴 |
| GET | `/users/rankings` | X | 글로벌 랭킹 + 업적 |
| GET | `/users/me/notifications` | O | 내 알림 목록 |
| GET | `/users/me/notifications/unread-count` | O | 안 읽은 알림 수 |
| PATCH | `/users/me/notifications/read` | O | 알림 모두 읽음 처리 |
| POST | `/users/me/fcm-token` | O | FCM 푸시 토큰 등록 |

### 문의 (Inquiries)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| POST | `/inquiries` | X | 문의 등록 |
| GET | `/inquiries` | O (Admin) | 문의 목록 조회 (관리자용) |

### 커뮤니티 (Boards)

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/boards` | X | 활성 게시판 목록 |
| GET | `/boards/sitemap-data` | X | 사이트맵 데이터 |
| GET | `/boards/my-posts` | O | 내 게시글 목록 |
| GET | `/boards/:slug` | X | 게시판 조회 (슬러그) |
| GET | `/boards/:slug/posts` | X | 게시글 목록 (페이지네이션) |
| GET | `/boards/:slug/posts/:postId` | X (선택적) | 게시글 상세 + 댓글 |
| POST | `/boards/:slug/posts` | O | 게시글 작성 |
| PATCH | `/boards/:slug/posts/:postId` | O | 게시글 수정 (작성자만) |
| DELETE | `/boards/:slug/posts/:postId` | O | 게시글 삭제 (작성자만) |
