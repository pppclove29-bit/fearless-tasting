import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { PrismaService } from '../prisma/prisma.service';
import { measure } from '../common/perf';
import { toImageUrl } from '../common/image-url';

/** bcrypt salt rounds: 8 ≈ ~0.3s (vs 10 ≈ ~1.4s). 2^8 = 256 iterations — 충분한 보안 수준 */
const BCRYPT_SALT_ROUNDS = 8;

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

interface NaverTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: string;
}

interface NaverUserResponse {
  resultcode: string;
  message: string;
  response: {
    id: string;
    email?: string;
    nickname?: string;
    name?: string;
    profile_image?: string;
  };
}

interface JwtPayload {
  sub: string;
}

interface AppleIdTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  is_private_email?: boolean | string;
}

interface AppleUserPayload {
  name?: {
    firstName?: string;
    lastName?: string;
  };
  email?: string;
}

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

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

    const existingAccount = await this.prisma.read.account.findUnique({
      where: { provider_providerId: { provider: 'kakao', providerId } },
      include: { user: true },
    });

    if (existingAccount) {
      return existingAccount.user;
    }

    return this.prisma.write.user.create({
      data: {
        email,
        nickname: await this.ensureUniqueNickname(nickname),
        accounts: {
          create: { provider: 'kakao', providerId },
        },
      },
    });
  }

  /** 네이버 인가 URL 생성 */
  getNaverAuthUrl(): string {
    const clientId = process.env.NAVER_CLIENT_ID;
    const callbackUrl = process.env.NAVER_CALLBACK_URL;
    // state는 CSRF 방지용 임의 문자열 (검증은 스테이트리스로 간소화)
    const state = Math.random().toString(36).slice(2);
    return `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl!)}&state=${state}`;
  }

  /** 네이버 인가 코드로 토큰 교환 */
  async exchangeNaverCode(code: string, state: string): Promise<NaverTokenResponse> {
    return measure('auth.exchangeNaverCode', async () => {
      const clientId = process.env.NAVER_CLIENT_ID;
      const clientSecret = process.env.NAVER_CLIENT_SECRET;
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        state,
      });
      const res = await fetch(`https://nid.naver.com/oauth2.0/token?${params.toString()}`);
      if (!res.ok) {
        throw new UnauthorizedException('네이버 토큰 교환 실패');
      }
      return res.json() as Promise<NaverTokenResponse>;
    });
  }

  /** 네이버 액세스 토큰으로 유저 정보 조회 */
  async getNaverUser(accessToken: string): Promise<NaverUserResponse> {
    return measure('auth.getNaverUser', async () => {
      const res = await fetch('https://openapi.naver.com/v1/nid/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new UnauthorizedException('네이버 유저 정보 조회 실패');
      }
      const data = await res.json() as NaverUserResponse;
      if (data.resultcode !== '00') {
        throw new UnauthorizedException(`네이버 유저 정보 조회 실패: ${data.message}`);
      }
      return data;
    });
  }

  /** 네이버 유저 정보로 계정 조회 또는 생성 */
  async findOrCreateFromNaver(naverUser: NaverUserResponse) {
    const profile = naverUser.response;
    const providerId = profile.id;
    const email = profile.email || `naver_${providerId}@naver.user`;
    const nickname = profile.nickname || profile.name || `user_${providerId.slice(0, 8)}`;

    const existingAccount = await this.prisma.read.account.findUnique({
      where: { provider_providerId: { provider: 'naver', providerId } },
      include: { user: true },
    });

    if (existingAccount) {
      return existingAccount.user;
    }

    // 이미 같은 이메일로 카카오 계정이 있으면 동일 유저에 네이버 계정 연결
    if (profile.email) {
      const userByEmail = await this.prisma.read.user.findUnique({
        where: { email: profile.email },
      });
      if (userByEmail) {
        await this.prisma.write.account.create({
          data: { provider: 'naver', providerId, userId: userByEmail.id },
        });
        return userByEmail;
      }
    }

    return this.prisma.write.user.create({
      data: {
        email,
        nickname: await this.ensureUniqueNickname(nickname),
        accounts: {
          create: { provider: 'naver', providerId },
        },
      },
    });
  }

  /** Apple 인가 URL 생성 (form_post 응답 모드 — name·email scope 요청 시 필수) */
  getAppleAuthUrl(): string {
    const clientId = process.env.APPLE_CLIENT_ID;
    const callbackUrl = process.env.APPLE_CALLBACK_URL;
    const state = Math.random().toString(36).slice(2);
    const params = new URLSearchParams({
      response_type: 'code id_token',
      response_mode: 'form_post',
      client_id: clientId!,
      redirect_uri: callbackUrl!,
      scope: 'name email',
      state,
    });
    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  /** Apple id_token 검증 (JWKS 서명·iss·aud·exp 확인) */
  async verifyAppleIdToken(idToken: string): Promise<AppleIdTokenPayload> {
    return measure('auth.verifyAppleIdToken', async () => {
      const clientId = process.env.APPLE_CLIENT_ID;
      if (!clientId) throw new UnauthorizedException('Apple 로그인 설정이 누락되었습니다');
      try {
        const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
          issuer: 'https://appleid.apple.com',
          audience: clientId,
        });
        if (!payload.sub) throw new Error('sub 없음');
        return payload as AppleIdTokenPayload;
      } catch {
        throw new UnauthorizedException('Apple id_token 검증 실패');
      }
    });
  }

  /** Apple 유저 정보로 계정 조회 또는 생성 */
  async findOrCreateFromApple(idPayload: AppleIdTokenPayload, userPayload?: AppleUserPayload) {
    const providerId = idPayload.sub;
    const email = idPayload.email || userPayload?.email || `apple_${providerId.slice(0, 8)}@apple.user`;
    const nameFromPayload = [userPayload?.name?.lastName, userPayload?.name?.firstName].filter(Boolean).join('');
    const nickname = nameFromPayload || `user_${providerId.slice(0, 8)}`;

    const existingAccount = await this.prisma.read.account.findUnique({
      where: { provider_providerId: { provider: 'apple', providerId } },
      include: { user: true },
    });

    if (existingAccount) {
      return existingAccount.user;
    }

    // 같은 이메일로 가입된 카카오·네이버 계정이 있으면 동일 유저에 Apple 계정 연결
    if (idPayload.email) {
      const userByEmail = await this.prisma.read.user.findUnique({
        where: { email: idPayload.email },
      });
      if (userByEmail) {
        await this.prisma.write.account.create({
          data: { provider: 'apple', providerId, userId: userByEmail.id },
        });
        return userByEmail;
      }
    }

    return this.prisma.write.user.create({
      data: {
        email,
        nickname: await this.ensureUniqueNickname(nickname),
        accounts: {
          create: { provider: 'apple', providerId },
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

    const hashedRefreshToken = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);
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
    const user = await measure('auth.getUserProfile', () =>
      this.prisma.read.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, nickname: true, role: true, profileImageUrl: true, pushEnabled: true, onboardingCompletedAt: true },
      }),
    );
    if (!user) return null;
    return { ...user, profileImageUrl: toImageUrl(user.profileImageUrl) };
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
