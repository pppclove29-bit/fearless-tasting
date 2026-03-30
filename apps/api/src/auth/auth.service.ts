import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '../prisma/prisma.service';
import { measure } from '../common/perf';

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
}

interface KakaoUserResponse {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

interface JwtPayload {
  sub: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /** 카카오 인가 URL 생성 */
  getKakaoAuthUrl(): string {
    const clientId = process.env.KAKAO_CLIENT_ID;
    const callbackUrl = process.env.KAKAO_CALLBACK_URL;
    return `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl!)}&response_type=code`;
  }

  /** 카카오 인가 코드로 토큰 교환 */
  async exchangeKakaoCode(code: string): Promise<KakaoTokenResponse> {
    return measure('auth.exchangeKakaoCode', async () => {
      const res = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: process.env.KAKAO_CLIENT_ID!,
          redirect_uri: process.env.KAKAO_CALLBACK_URL!,
          code,
          ...(process.env.KAKAO_CLIENT_SECRET ? { client_secret: process.env.KAKAO_CLIENT_SECRET } : {}),
        }),
      });

      if (!res.ok) {
        throw new UnauthorizedException('카카오 토큰 교환 실패');
      }

      return res.json() as Promise<KakaoTokenResponse>;
    });
  }

  /** 카카오 액세스 토큰으로 유저 정보 조회 */
  async getKakaoUser(accessToken: string): Promise<KakaoUserResponse> {
    return measure('auth.getKakaoUser', async () => {
      const res = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new UnauthorizedException('카카오 유저 정보 조회 실패');
      }

      return res.json() as Promise<KakaoUserResponse>;
    });
  }

  /** 카카오 유저 정보로 계정 조회 또는 생성 */
  async findOrCreateFromKakao(kakaoUser: KakaoUserResponse) {
    const providerId = String(kakaoUser.id);
    const email = kakaoUser.kakao_account?.email || `kakao_${providerId}@kakao.user`;
    const nickname = kakaoUser.kakao_account?.profile?.nickname || `user_${providerId}`;
    const profileImageUrl = kakaoUser.kakao_account?.profile?.profile_image_url;

    const existingAccount = await this.prisma.read.account.findUnique({
      where: { provider_providerId: { provider: 'kakao', providerId } },
      include: { user: true },
    });

    if (existingAccount) {
      // 카카오 프로필 이미지가 변경된 경우 갱신
      if (profileImageUrl && existingAccount.user.profileImageUrl !== profileImageUrl) {
        return this.prisma.write.user.update({
          where: { id: existingAccount.user.id },
          data: { profileImageUrl },
        });
      }
      return existingAccount.user;
    }

    return this.prisma.write.user.create({
      data: {
        email,
        nickname: await this.ensureUniqueNickname(nickname),
        profileImageUrl,
        accounts: {
          create: { provider: 'kakao', providerId },
        },
      },
    });
  }

  /** 닉네임 중복 시 숫자 붙여 고유하게 */
  private async ensureUniqueNickname(nickname: string): Promise<string> {
    const existing = await this.prisma.read.user.findUnique({
      where: { nickname },
    });

    if (!existing) return nickname;

    let counter = 1;
    let candidate = `${nickname}${counter}`;
    while (
      await this.prisma.read.user.findUnique({ where: { nickname: candidate } })
    ) {
      counter++;
      candidate = `${nickname}${counter}`;
    }
    return candidate;
  }

  /** JWT Access Token + Refresh Token 생성 */
  async generateTokens(userId: string) {
    const payload: JwtPayload = { sub: userId };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.write.account.updateMany({
      where: { userId },
      data: { refreshToken: hashedRefreshToken },
    });

    return { accessToken, refreshToken };
  }

  /** Refresh Token으로 Access Token 갱신 */
  async refreshAccessToken(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰');
    }

    const accounts = await measure('auth.refresh.findAccounts', () =>
      this.prisma.read.account.findMany({
        where: { userId: payload.sub },
      }),
    );

    const valid = await measure('auth.refresh.bcryptCompare', () =>
      Promise.any(
        accounts.map(async (account) => {
          if (!account.refreshToken) return false;
          return bcrypt.compare(refreshToken, account.refreshToken);
        }),
      ).catch(() => false),
    );

    if (!valid) {
      throw new UnauthorizedException('리프레시 토큰 불일치');
    }

    return measure('auth.refresh.generateTokens', () =>
      this.generateTokens(payload.sub),
    );
  }

  /** 로그아웃: DB의 Refresh Token 무효화 */
  async logout(userId: string) {
    await this.prisma.write.account.updateMany({
      where: { userId },
      data: { refreshToken: null },
    });
  }

  /** Refresh Token으로 유저 식별 후 로그아웃 */
  async logoutByRefreshToken(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      return; // 토큰 검증 실패 시 무시
    }

    await this.logout(payload.sub);
  }

  /** lastActiveAt 갱신 (fire-and-forget) */
  updateLastActive(userId: string) {
    this.prisma.write.user
      .update({ where: { id: userId }, data: { lastActiveAt: new Date() } })
      .catch(() => {});
  }

  /** 유저 프로필 조회 (id, email, nickname, role) */
  async getUserProfile(userId: string) {
    return measure('auth.getUserProfile', () =>
      this.prisma.read.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, nickname: true, role: true, profileImageUrl: true },
      }),
    );
  }

  /** Access Token에서 유저 정보 추출 */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException('유효하지 않은 액세스 토큰');
    }
  }
}
