import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { RoomUnlockedGuard } from './room-unlocked.guard';
import {
  INVITE_REQUIRED_SINCE,
  isInviteRequired,
  soloRestaurantsLeft,
  SOLO_RESTAURANT_LIMIT,
} from '../invite-gate';
import type { PrismaService } from '../../prisma/prisma.service';

const AFTER = new Date(INVITE_REQUIRED_SINCE.getTime() + 60_000);
const BEFORE = new Date(INVITE_REQUIRED_SINCE.getTime() - 60_000);
const LIMIT = SOLO_RESTAURANT_LIMIT;

function run(
  room: { createdAt: Date; _count: { members: number; restaurants: number } } | null,
  body: object = {},
) {
  const findUnique = jest.fn().mockResolvedValue(room);
  const prisma: PrismaService = { write: { room: { findUnique } } } as never;
  const guard = new RoomUnlockedGuard(prisma);
  const ctx = {
    switchToHttp: () => ({ getRequest: () => ({ params: { id: 'room1' }, body }) }),
  } as never as ExecutionContext;
  return { result: guard.canActivate(ctx), findUnique };
}

describe('소프트 게이트 정책', () => {
  it('혼자인 새 방은 식당 한도까지 남은 수를 알려준다', () => {
    expect(soloRestaurantsLeft(AFTER, 1, 0)).toBe(LIMIT);
    expect(soloRestaurantsLeft(AFTER, 1, LIMIT - 1)).toBe(1);
    expect(soloRestaurantsLeft(AFTER, 1, LIMIT + 5)).toBe(0);
  });
  it('한도를 채우기 전에는 초대가 필요 없다 (혼자서도 첫 기록을 해볼 수 있다)', () => {
    expect(isInviteRequired(AFTER, 1, 0)).toBe(false);
    expect(isInviteRequired(AFTER, 1, LIMIT - 1)).toBe(false);
  });
  it('한도를 채우면 새 식당 추가에 초대가 필요하다', () => {
    expect(isInviteRequired(AFTER, 1, LIMIT)).toBe(true);
  });
  it('2명 이상이거나 정책 이전에 만든 방은 제한이 없다', () => {
    expect(soloRestaurantsLeft(AFTER, 2, 50)).toBeNull();
    expect(soloRestaurantsLeft(BEFORE, 1, 50)).toBeNull();
    expect(isInviteRequired(BEFORE, 1, 50)).toBe(false);
  });
});

describe('RoomUnlockedGuard', () => {
  it('혼자인 새 방이 한도를 채운 뒤 새 식당을 추가하면 INVITE_REQUIRED 403', async () => {
    const { result } = run({ createdAt: AFTER, _count: { members: 1, restaurants: LIMIT } });
    const err = await result.catch((e: ForbiddenException) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect((err as ForbiddenException).getResponse()).toMatchObject({ code: 'INVITE_REQUIRED' });
  });

  it('한도 전이면 통과', async () => {
    await expect(
      run({ createdAt: AFTER, _count: { members: 1, restaurants: LIMIT - 1 } }).result,
    ).resolves.toBe(true);
  });

  it('한도를 채웠어도 기존 식당에 기록(restaurantId만 보냄)하는 것은 통과', async () => {
    const { result, findUnique } = run(
      { createdAt: AFTER, _count: { members: 1, restaurants: LIMIT } },
      { restaurantId: 'r1', visit: {}, review: {} },
    );
    await expect(result).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('새 식당 정보를 함께 보내면 restaurantId가 있어도 검사한다', async () => {
    const { result } = run(
      { createdAt: AFTER, _count: { members: 1, restaurants: LIMIT } },
      { restaurantId: 'r1', restaurant: { name: 'x' } },
    );
    await expect(result).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('친구가 들어와 2명이면 통과', async () => {
    await expect(
      run({ createdAt: AFTER, _count: { members: 2, restaurants: 99 } }).result,
    ).resolves.toBe(true);
  });

  it('기존 1인 방은 통과', async () => {
    await expect(
      run({ createdAt: BEFORE, _count: { members: 1, restaurants: 99 } }).result,
    ).resolves.toBe(true);
  });

  it('방이 없으면 404', async () => {
    await expect(run(null).result).rejects.toBeInstanceOf(NotFoundException);
  });
});
