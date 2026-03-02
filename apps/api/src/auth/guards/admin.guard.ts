import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

/** JwtAuthGuard를 먼저 통과한 뒤, role === 'admin'인지 확인하는 Guard */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwtAuthGuard: JwtAuthGuard) {}

  canActivate(context: ExecutionContext): boolean {
    // JWT 인증 먼저 수행
    this.jwtAuthGuard.canActivate(context);

    const request = context.switchToHttp().getRequest<Request & { user: { role: string } }>();

    if (request.user.role !== 'admin') {
      throw new ForbiddenException('관리자 권한이 필요합니다');
    }

    return true;
  }
}
