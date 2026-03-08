# Prisma 규칙

## 기본 원칙

- DB: MySQL 8.0, ORM: Prisma
- ORM 사용을 기본으로 한다
- Raw Query가 불가피한 경우 반드시 사유 주석을 남긴다
- 스키마 변경 시 migration 파일을 반드시 생성한다

## Reader/Writer 분리

`PrismaService`는 `read`(Reader)와 `write`(Writer) 두 개의 클라이언트를 제공한다.

| 작업 | 사용할 클라이언트 |
|------|-------------------|
| SELECT (조회) | `this.prisma.read` |
| INSERT (생성) | `this.prisma.write` |
| UPDATE (수정) | `this.prisma.write` |
| DELETE (삭제) | `this.prisma.write` |
| 트랜잭션 | `this.prisma.write.$transaction()` |

```typescript
// 올바른 예
async findAllRestaurants(roomId: number) {
  return this.prisma.read.roomRestaurant.findMany({  // Reader 사용
    where: { roomId },
  });
}

async createRestaurant(roomId: number, name: string) {
  return this.prisma.write.roomRestaurant.create({   // Writer 사용
    data: { roomId, name },
  });
}

// 트랜잭션 (Writer에서만)
async createVisitWithReview() {
  return this.prisma.write.$transaction(async (tx) => {
    const visit = await tx.roomVisit.create({ ... });
    await tx.roomReview.create({ ... });
  });
}
```

### Reader/Writer 분리 이유

- 읽기 부하를 별도 DB 인스턴스로 분산
- 쓰기 작업이 읽기 성능에 영향을 주지 않음
- 프로덕션에서는 MySQL Read Replica를 Reader로 사용

### `DATABASE_READER_URL` 미설정 시

`DATABASE_URL`과 동일한 DB를 사용한다. 로컬 개발 시 Reader/Writer를 굳이 분리하지 않아도 된다.

## 쿼리 작성 규칙

### N+1 방지

```typescript
// 잘못된 예 - N+1 쿼리
const restaurants = await this.prisma.read.roomRestaurant.findMany({ where: { roomId } });
for (const r of restaurants) {
  const visits = await this.prisma.read.roomVisit.findMany({  // X
    where: { roomRestaurantId: r.id },
  });
}

// 올바른 예 - include 사용
const restaurants = await this.prisma.read.roomRestaurant.findMany({
  where: { roomId },
  include: { visits: { include: { reviews: true } } },  // O
});
```

### 필요한 필드만 조회

```typescript
// select로 필요한 필드만
const names = await this.prisma.read.roomRestaurant.findMany({
  where: { roomId },
  select: { id: true, name: true },
});
```

### 트랜잭션

조회 후 업데이트가 연속되면 반드시 트랜잭션을 사용한다 (Race Condition 방지).

```typescript
await this.prisma.write.$transaction(async (tx) => {
  const user = await tx.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundException();
  await tx.user.update({ where: { id }, data: { ... } });
});
```

### 인덱스 확인

WHERE, JOIN, ORDER BY에 사용되는 컬럼은 `@@index`가 있는지 `schema.prisma`에서 확인한다.

## 마이그레이션

```bash
# 스키마 변경 후 마이그레이션 생성
pnpm --filter @repo/api exec prisma migrate dev --name <migration-name>

# 프로덕션 배포 시
pnpm --filter @repo/api exec prisma migrate deploy

# Prisma Client 재생성
pnpm --filter @repo/api exec prisma generate

# DB GUI 열기
pnpm --filter @repo/api exec prisma studio
```
