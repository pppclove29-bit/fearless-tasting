import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

/** JwtAuthGuard를 먼저 통과한 뒤, DB에서 role === 'admin'인지 확인하는 Guard */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // JWT 인증 먼저 수행
    this.jwtAuthGuard.canActivate(context);

    const request = context.switchToHttp().getRequest<Request & { user: { id: string } }>();
    const user = await this.prisma.read.user.findUnique({
      where: { id: request.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      throw new ForbiddenException('관리자 권한이 필요합니다');
    }

    return true;
  }
}
