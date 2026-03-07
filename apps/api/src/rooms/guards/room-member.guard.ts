import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoomMemberGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException('로그인이 필요합니다');
    }

    const payload = this.authService.verifyAccessToken(token);
    const user = { id: payload.sub };
    (request as Request & { user: typeof user }).user = user;

    const roomId = request.params.id as string | undefined;
    if (!roomId) {
      throw new ForbiddenException('방 ID가 필요합니다');
    }

    const member = await this.prisma.read.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });

    if (!member) {
      throw new ForbiddenException('이 방의 멤버가 아닙니다');
    }

    (request as Request & { roomMember: typeof member }).roomMember = member;
    return true;
  }
}
