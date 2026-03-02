import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { RoomMemberGuard } from './room-member.guard';

interface RequestWithRoomMember extends Request {
  roomMember: { role: string };
}

@Injectable()
export class RoomManagerGuard implements CanActivate {
  constructor(private readonly roomMemberGuard: RoomMemberGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.roomMemberGuard.canActivate(context);

    const request = context.switchToHttp().getRequest<RequestWithRoomMember>();
    const { role } = request.roomMember;

    if (role !== 'owner' && role !== 'manager') {
      throw new ForbiddenException('매니저 이상의 권한이 필요합니다');
    }

    return true;
  }
}
