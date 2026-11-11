import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { isInviteRequired, SOLO_RESTAURANT_LIMIT } from '../invite-gate';

/**
 * 혼자인 새 방이 식당 SOLO_RESTAURANT_LIMIT곳을 채운 뒤 "새 식당 추가"를 막는다 (소프트 게이트).
 * 이미 있는 식당에 방문·리뷰를 남기는 것은 막지 않는다 — 기록 경험은 충분히 해보게 한다.
 * 새 식당을 만드는 라우트에만 붙인다: @UseGuards(RoomMemberGuard, RoomUnlockedGuard)
 */
@Injectable()
export class RoomUnlockedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const roomId = request.params.id as string | undefined;
    if (!roomId) throw new ForbiddenException('방 ID가 필요합니다');

    // 기록 위저드(POST :id/records)가 기존 식당에 기록하는 경우는 식당이 늘지 않으므로 통과
    const body = request.body as { restaurantId?: string; restaurant?: object } | undefined;
    if (body?.restaurantId && !body.restaurant) return true;

    // 멤버 수는 방금 친구가 입장한 직후에도 정확해야 하므로 writer에서 읽는다
    const room = await this.prisma.write.room.findUnique({
      where: { id: roomId },
      select: { createdAt: true, _count: { select: { members: true, restaurants: true } } },
    });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');

    if (isInviteRequired(room.createdAt, room._count.members, room._count.restaurants)) {
      throw new ForbiddenException({
        message: `혼자서는 식당 ${SOLO_RESTAURANT_LIMIT}곳까지 기록할 수 있어요. 같이 먹을 사람을 초대하면 계속 기록할 수 있어요`,
        code: 'INVITE_REQUIRED',
      });
    }
    return true;
  }
}
