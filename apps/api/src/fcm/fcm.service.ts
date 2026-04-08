import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private isInitialized = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const credentials = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!credentials) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT 미설정 — FCM 비활성');
      return;
    }

    try {
      const serviceAccount = JSON.parse(credentials);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.isInitialized = true;
      this.logger.log('Firebase Admin 초기화 완료');
    } catch (err) {
      this.logger.error('Firebase Admin 초기화 실패', err);
    }
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
    if (!this.isInitialized || userIds.length === 0) return;

    const tokens = await this.prisma.read.fcmToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    const message: admin.messaging.MulticastMessage = {
      tokens: tokens.map((t) => t.token),
      notification: { title, body },
      data,
      webpush: {
        fcmOptions: { link: data?.['link'] ?? '/' },
      },
    };

    try {
      const result = await admin.messaging().sendEachForMulticast(message);

      // 실패한 토큰 정리 (만료/삭제된 토큰)
      if (result.failureCount > 0) {
        const invalidTokens: string[] = [];
        result.responses.forEach((resp, idx) => {
          if (
            !resp.success &&
            resp.error?.code &&
            [
              'messaging/invalid-registration-token',
              'messaging/registration-token-not-registered',
            ].includes(resp.error.code)
          ) {
            invalidTokens.push(tokens[idx].token);
          }
        });
        if (invalidTokens.length > 0) {
          await this.prisma.write.fcmToken.deleteMany({
            where: { token: { in: invalidTokens } },
          });
          this.logger.log(`만료된 FCM 토큰 ${invalidTokens.length}개 정리`);
        }
      }

      this.logger.debug(
        `FCM 발송: 성공 ${result.successCount} / 실패 ${result.failureCount}`,
      );
    } catch (err) {
      this.logger.error('FCM 발송 실패', err);
    }
  }
}
