import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { isInviteRequired } from '../invite-gate';

/**
 * 초대 필수 방이 아직 혼자일 때 기록 추가를 막는다.
 * RoomMemberGuard 뒤에 둔다: @UseGuards(RoomMemberGuard, RoomUnlockedGuard)
 */
@Injectable()
export class RoomUnlockedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const roomId = request.params.id as string | undefined;
    if (!roomId) throw new ForbiddenException('방 ID가 필요합니다');

    // 멤버 수는 방금 친구가 입장한 직후에도 정확해야 하므로 writer에서 읽는다
    const room = await this.prisma.write.room.findUnique({
      where: { id: roomId },
      select: { createdAt: true, _count: { select: { members: true } } },
    });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');

    if (isInviteRequired(room.createdAt, room._count.members)) {
      throw new ForbiddenException({
        message: '친구를 초대해야 기록을 시작할 수 있어요',
        code: 'INVITE_REQUIRED',
      });
    }
    return true;
  }
}
