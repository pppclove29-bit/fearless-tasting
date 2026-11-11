import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { RoomUnlockedGuard } from './room-unlocked.guard';
import { INVITE_REQUIRED_SINCE, isInviteRequired } from '../invite-gate';
import type { PrismaService } from '../../prisma/prisma.service';

const AFTER = new Date(INVITE_REQUIRED_SINCE.getTime() + 60_000);
const BEFORE = new Date(INVITE_REQUIRED_SINCE.getTime() - 60_000);

function run(room: { createdAt: Date; _count: { members: number; restaurants: number } } | null) {
  const findUnique = jest.fn().mockResolvedValue(room);
  const prisma: PrismaService = { write: { room: { findUnique } } } as never;
  const guard = new RoomUnlockedGuard(prisma);
  const ctx = {
    switchToHttp: () => ({ getRequest: () => ({ params: { id: 'room1' } }) }),
  } as never as ExecutionContext;
  return { result: guard.canActivate(ctx), findUnique };
}

describe('isInviteRequired', () => {
  it('정책 시행 이후 만든 방이 혼자면 초대 필수', () => {
    expect(isInviteRequired(AFTER, 1, 0)).toBe(true);
  });
  it('멤버가 2명 이상이면 해제', () => {
    expect(isInviteRequired(AFTER, 2, 0)).toBe(false);
  });
  it('정책 시행 이전에 만든 방은 혼자여도 적용하지 않는다 (기존 사용자 보호)', () => {
    expect(isInviteRequired(BEFORE, 1, 0)).toBe(false);
  });
  it('이미 기록이 있는 방은 멤버가 나가 1명이 돼도 다시 잠기지 않는다', () => {
    expect(isInviteRequired(AFTER, 1, 3)).toBe(false);
  });
});

describe('RoomUnlockedGuard', () => {
  it('초대 필수 방이 혼자면 INVITE_REQUIRED 코드와 함께 403', async () => {
    const { result } = run({ createdAt: AFTER, _count: { members: 1, restaurants: 0 } });
    const err = await result.catch((e: ForbiddenException) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect((err as ForbiddenException).getResponse()).toMatchObject({ code: 'INVITE_REQUIRED' });
  });

  it('친구가 들어와 2명이면 통과', async () => {
    await expect(
      run({ createdAt: AFTER, _count: { members: 2, restaurants: 0 } }).result,
    ).resolves.toBe(true);
  });

  it('기존 1인 방은 통과', async () => {
    await expect(
      run({ createdAt: BEFORE, _count: { members: 1, restaurants: 0 } }).result,
    ).resolves.toBe(true);
  });

  it('입장 직후에도 정확하도록 writer에서 멤버 수를 읽는다', async () => {
    const { result, findUnique } = run({
      createdAt: AFTER,
      _count: { members: 2, restaurants: 0 },
    });
    await result;
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'room1' } }));
  });

  it('방이 없으면 404', async () => {
    await expect(run(null).result).rejects.toBeInstanceOf(NotFoundException);
  });
});
