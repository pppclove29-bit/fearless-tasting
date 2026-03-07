import { Controller, Get, Post, Body, Query, Res, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** 카카오 OAuth 시작: 카카오 인가 페이지로 리다이렉트 */
  @Get('kakao')
  @ApiOperation({ summary: '카카오 로그인', description: '카카오 OAuth 인가 페이지로 302 리다이렉트합니다.' })
  kakaoLogin(@Res() res: Response) {
    const url = this.authService.getKakaoAuthUrl();
    res.redirect(url);
  }

  /** 카카오 OAuth 콜백: 인가 코드 → 토큰 교환 → JWT 발급 → 프론트 리다이렉트 */
  @Get('kakao/callback')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiExcludeEndpoint()
  async kakaoCallback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      throw new UnauthorizedException('인가 코드가 없습니다');
    }

    const kakaoToken = await this.authService.exchangeKakaoCode(code);
    const kakaoUser = await this.authService.getKakaoUser(kakaoToken.access_token);
    const user = await this.authService.findOrCreateFromKakao(kakaoUser);
    const tokens = await this.authService.generateTokens(user.id, user.email, user.role);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4321';
    const params = new URLSearchParams({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    res.redirect(`${frontendUrl}/login?${params.toString()}`);
  }

  /** 현재 로그인 유저 정보 */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '내 정보 조회', description: 'JWT 토큰으로 현재 로그인된 유저 정보를 반환합니다.' })
  me(@CurrentUser() user: { id: string; email: string; role: string }) {
    return user;
  }

  /** Refresh Token으로 Access Token 갱신 */
  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '토큰 갱신', description: 'Refresh Token으로 Access Token을 갱신합니다.' })
  async refresh(@Body() body: { refreshToken?: string }, @Req() req: Request) {
    const refreshToken = body?.refreshToken || req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('리프레시 토큰이 없습니다');
    }

    const tokens = await this.authService.refreshAccessToken(refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /** 로그아웃: DB RT 무효화 */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '로그아웃', description: 'DB의 Refresh Token을 무효화합니다.' })
  async logout(@CurrentUser() user: { id: string }) {
    await this.authService.logout(user.id);
    return { message: '로그아웃 완료' };
  }
}
