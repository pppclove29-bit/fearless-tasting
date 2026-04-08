import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private serviceAccount: ServiceAccount | null = null;
  private accessTokenCache: AccessTokenCache | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const credentials = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!credentials) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT 미설정 — FCM 비활성');
      return;
    }

    try {
      const parsed = JSON.parse(credentials);
      this.serviceAccount = {
        project_id: parsed.project_id,
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      };
      this.logger.log('FCM 초기화 완료 (HTTP v1)');
    } catch (err) {
      this.logger.error('FCM 초기화 실패 — 서비스 계정 파싱 오류', err);
    }
  }

  /** Google OAuth2 액세스 토큰 발급 (JWT → token exchange) */
  private async getAccessToken(): Promise<string | null> {
    if (!this.serviceAccount) return null;

    // 캐시된 토큰이 유효하면 재사용
    if (this.accessTokenCache && Date.now() < this.accessTokenCache.expiresAt - 60_000) {
      return this.accessTokenCache.token;
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      const header = this.base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const payload = this.base64url(JSON.stringify({
        iss: this.serviceAccount.client_email,
        sub: this.serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
      }));

      const signInput = `${header}.${payload}`;
      const crypto = await import('crypto');
      const signature = crypto.createSign('RSA-SHA256')
        .update(signInput)
        .sign(this.serviceAccount.private_key, 'base64url');

      const jwt = `${signInput}.${signature}`;

      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      });

      if (!res.ok) {
        this.logger.error(`토큰 교환 실패: ${res.status}`);
        return null;
      }

      const data = await res.json() as { access_token: string; expires_in: number };
      this.accessTokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };
      return data.access_token;
    } catch (err) {
      this.logger.error('액세스 토큰 발급 실패', err);
      return null;
    }
  }

  private base64url(str: string): string {
    return Buffer.from(str).toString('base64url');
  }

  /** FCM 토큰 등록 (기존 토큰이면 userId 갱신) */
  async registerToken(userId: string, token: string, device?: string) {
    await this.prisma.write.fcmToken.upsert({
      where: { token },
      create: { userId, token, device },
      update: { userId, device, updatedAt: new Date() },
    });
  }

  /** FCM 토큰 삭제 */
  async removeToken(token: string) {
    await this.prisma.write.fcmToken.deleteMany({ where: { token } });
  }

  /** 유저의 모든 FCM 토큰 삭제 (로그아웃 시) */
  async removeAllTokens(userId: string) {
    await this.prisma.write.fcmToken.deleteMany({ where: { userId } });
  }

  /** 특정 유저들에게 푸시 발송 */
  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    if (!this.serviceAccount || userIds.length === 0) return;

    // pushEnabled = false인 유저 제외
    const enabledUsers = await this.prisma.read.user.findMany({
      where: { id: { in: userIds }, pushEnabled: true },
      select: { id: true },
    });
    if (enabledUsers.length === 0) return;

    const tokens = await this.prisma.read.fcmToken.findMany({
      where: { userId: { in: enabledUsers.map((u) => u.id) } },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const accessToken = await this.getAccessToken();
    if (!accessToken) return;

    const url = `https://fcm.googleapis.com/v1/projects/${this.serviceAccount.project_id}/messages:send`;
    const invalidTokens: string[] = [];

    // 각 토큰에 개별 발송 (HTTP v1은 multicast 미지원)
    const results = await Promise.allSettled(
      tokens.map(async ({ token }) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              data,
              webpush: { fcmOptions: { link: data?.['link'] ?? '/' } },
            },
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: { details?: { errorCode?: string }[] } };
          const errorCode = err?.error?.details?.[0]?.errorCode;
          if (errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT') {
            invalidTokens.push(token);
          }
        }

        return res.ok;
      }),
    );

    // 만료된 토큰 정리
    if (invalidTokens.length > 0) {
      await this.prisma.write.fcmToken.deleteMany({
        where: { token: { in: invalidTokens } },
      });
      this.logger.log(`만료된 FCM 토큰 ${invalidTokens.length}개 정리`);
    }

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    this.logger.debug(`FCM 발송: 성공 ${successCount} / 전체 ${tokens.length}`);
  }
}
