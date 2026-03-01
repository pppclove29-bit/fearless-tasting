import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException('로그인이 필요합니다');
    }

    const payload = this.authService.verifyAccessToken(token);
    (request as Request & { user: { id: string; email: string } }).user = {
      id: payload.sub,
      email: payload.email,
    };

    return true;
  }
}
