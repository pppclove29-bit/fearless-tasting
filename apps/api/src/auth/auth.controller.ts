import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * OAuth 성공 후 돌아갈 주소.
   * state가 'app.'으로 시작하면 네이티브 앱에서 시작한 로그인이므로
   * 커스텀 스킴 딥링크로 보내 앱이 토큰을 받게 한다. 그 외엔 웹 프론트로.
   */
  private buildLoginRedirect(
    state: string | undefined,
    tokens: { accessToken: string; refreshToken: string },
  ): string {
    const params = new URLSearchParams({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    if (state?.startsWith('app.')) {
      const scheme = process.env.APP_DEEP_LINK_SCHEME || 'kr.fearlesstasting.app';
      return `${scheme}://login?${params.toString()}`;
    }
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4321';
    return `${frontendUrl}/login?${params.toString()}`;
  }

  /** 카카오 OAuth 시작: 카카오 인가 페이지로 리다이렉트 */
  @Get('kakao')
  @ApiOperation({
    summary: '카카오 로그인',
    description: '카카오 OAuth 인가 페이지로 302 리다이렉트합니다. client=app이면 앱 딥링크로 복귀합니다.',
  })
  kakaoLogin(@Query('client') client: string, @Res() res: Response) {
    const state = this.authService.buildOAuthState(client === 'app' ? 'app' : 'web');
    res.redirect(this.authService.getKakaoAuthUrl(state));
  }

  /** 카카오 OAuth 콜백: 인가 코드 → 토큰 교환 → JWT 발급 → 프론트 리다이렉트 */
  @Get('kakao/callback')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiExcludeEndpoint()
  async kakaoCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code) {
      throw new UnauthorizedException('인가 코드가 없습니다');
    }

    const kakaoToken = await this.authService.exchangeKakaoCode(code);
    const kakaoUser = await this.authService.getKakaoUser(kakaoToken.access_token);
    const user = await this.authService.findOrCreateFromKakao(kakaoUser);
    const tokens = await this.authService.generateTokens(user.id);

    res.redirect(this.buildLoginRedirect(state, tokens));
  }

  /** 네이버 OAuth 시작: 네이버 인가 페이지로 리다이렉트 */
  @Get('naver')
  @ApiOperation({
    summary: '네이버 로그인',
    description: '네이버 OAuth 인가 페이지로 302 리다이렉트합니다.',
  })
  naverLogin(@Query('client') client: string, @Res() res: Response) {
    const state = this.authService.buildOAuthState(client === 'app' ? 'app' : 'web');
    res.redirect(this.authService.getNaverAuthUrl(state));
  }

  /** 네이버 OAuth 콜백: 인가 코드 → 토큰 교환 → JWT 발급 → 프론트 리다이렉트 */
  @Get('naver/callback')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiExcludeEndpoint()
  async naverCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code) {
      throw new UnauthorizedException('인가 코드가 없습니다');
    }

    const naverToken = await this.authService.exchangeNaverCode(code, state || '');
    const naverUser = await this.authService.getNaverUser(naverToken.access_token);
    const user = await this.authService.findOrCreateFromNaver(naverUser);
    const tokens = await this.authService.generateTokens(user.id);

    res.redirect(this.buildLoginRedirect(state, tokens));
  }

  /** 현재 로그인 유저 정보 */
  @Get('me')
  @Throttle({ default: { ttl: 60000, limit: 120 } })
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '내 정보 조회',
    description: 'JWT 토큰으로 현재 로그인된 유저 정보를 반환합니다.',
  })
  async me(@CurrentUser() user: { id: string }) {
    // fire-and-forget: lastActiveAt 갱신
    this.authService.updateLastActive(user.id);
    const profile = await this.authService.getUserProfile(user.id);
    return profile ?? user;
  }

  /** Refresh Token으로 Access Token 갱신 */
  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: '토큰 갱신',
    description: 'Refresh Token으로 Access Token을 갱신합니다.',
  })
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

  /** 로그아웃: DB RT 무효화 + 쿠키 삭제 */
  @Post('logout')
  @ApiOperation({ summary: '로그아웃', description: 'DB의 Refresh Token을 무효화하고 쿠키를 삭제합니다.' })
  async logout(@Req() req: Request, @Body() body: { refreshToken?: string }) {
    // 1) Access Token으로 유저 식별 시도
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = this.authService.verifyAccessToken(authHeader.slice(7));
        await this.authService.logout(payload.sub);
      } catch {
        // Access Token 만료 — Refresh Token으로 fallback
      }
    }

    // 2) Refresh Token으로 유저 식별
    const refreshToken = body?.refreshToken || req.cookies?.refresh_token;
    if (refreshToken) {
      await this.authService.logoutByRefreshToken(refreshToken);
    }

    // 3) 쿠키 삭제 (httpOnly / non-httpOnly 모두)
    const res = req.res!;
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    return { message: '로그아웃 완료' };
  }
}
