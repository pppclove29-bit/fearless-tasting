# NestJS 규칙

## 모듈 구조

- 기능 단위로 모듈을 분리한다 (`rooms/`, `users/`, `inquiries/`)
- 각 모듈은 `*.module.ts`, `*.controller.ts`, `*.service.ts`로 구성한다
- 필요 시 `dto/` 폴더에 DTO 클래스를 둔다
- 공통 모듈은 `@Global()` 데코레이터로 전역 등록한다 (예: `PrismaModule`)

## Controller 규칙

- 요청/응답 처리만 담당한다
- **비즈니스 로직은 절대 작성하지 않는다**
- DTO로 입력 데이터를 검증한다
- 하나의 엔드포인트는 하나의 Service 메서드를 호출한다

```typescript
// 올바른 예 - Controller는 라우팅과 DTO 처리만
@Post()
create(@Body() dto: CreateRoomRestaurantDto, @CurrentUser() user: JwtPayload) {
  return this.roomsService.createRestaurant(
    roomId,
    user.sub,
    dto.name,
    dto.address,
    dto.category,
  );
}

// 잘못된 예 - Controller에 비즈니스 로직
@Post()
async create(@Body() dto: CreateRoomRestaurantDto) {
  const exists = await this.prisma.read.roomRestaurant.findFirst({ ... });  // X
  if (exists) throw new ConflictException();                                 // X
  return this.prisma.write.roomRestaurant.create({ ... });                   // X
}
```

## Service 규칙

- 비즈니스 로직을 담당한다
- **DTO를 Service로 바로 넘기지 않는다.** 필요한 값만 개별 파라미터로 전달한다
- DB 조회 결과의 **null 체크를 반드시 수행**한다
- 함수 하나에 하나의 책임만 갖는다

```typescript
// 올바른 예 - 개별 파라미터
async createRestaurant(roomId: number, userId: number, name: string, address: string, category: string) { ... }

// 잘못된 예 - DTO 직접 전달
async createRestaurant(dto: CreateRoomRestaurantDto) { ... }
```

## 에러 처리

- 외부 API 호출 시 반드시 try-catch를 사용한다
- NestJS의 `HttpException` 계열을 사용한다:
  - `NotFoundException` (404) - 리소스를 찾을 수 없음
  - `BadRequestException` (400) - 잘못된 요청
  - `ConflictException` (409) - 중복 데이터
  - `UnauthorizedException` (401) - 인증 실패
  - `ForbiddenException` (403) - 권한 없음
- 에러 메시지에 사용자 민감 정보를 포함하지 않는다
