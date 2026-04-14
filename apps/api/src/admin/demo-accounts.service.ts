import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class DemoAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /** 데모 계정 생성 (User + DemoAccount 트랜잭션) */
  async create(nickname: string, memo?: string, profileImageUrl?: string) {
    const existing = await this.prisma.read.user.findUnique({
      where: { nickname },
    });
    if (existing) {
      throw new ConflictException('이미 사용 중인 닉네임입니다');
    }

    const result = await this.prisma.write.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@demo.local`,
          nickname,
          profileImageUrl: profileImageUrl ?? null,
          role: 'user',
        },
      });

      const demoAccount = await tx.demoAccount.create({
        data: {
          userId: user.id,
          memo: memo ?? null,
        },
      });

      return { demoAccount, user };
    });

    return {
      id: result.demoAccount.id,
      userId: result.user.id,
      nickname: result.user.nickname,
      profileImageUrl: result.user.profileImageUrl,
      memo: result.demoAccount.memo,
      createdAt: result.demoAccount.createdAt,
    };
  }

  /** 데모 계정 목록 조회 */
  async findAll() {
    const demoAccounts = await this.prisma.read.demoAccount.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
    });

    return demoAccounts.map((da) => ({
      id: da.id,
      userId: da.user.id,
      nickname: da.user.nickname,
      profileImageUrl: da.user.profileImageUrl,
      memo: da.memo,
      createdAt: da.createdAt,
    }));
  }

  /** 데모 계정 수정 (닉네임, 메모, 프로필 이미지) */
  async update(id: string, nickname?: string, memo?: string, profileImageUrl?: string) {
    const demoAccount = await this.prisma.read.demoAccount.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    });
    if (!demoAccount) {
      throw new NotFoundException('데모 계정을 찾을 수 없습니다');
    }

    if (nickname) {
      const existing = await this.prisma.read.user.findFirst({
        where: { nickname, NOT: { id: demoAccount.user.id } },
      });
      if (existing) {
        throw new ConflictException('이미 사용 중인 닉네임입니다');
      }
    }

    await this.prisma.write.$transaction(async (tx) => {
      const userData: { nickname?: string; profileImageUrl?: string } = {};
      if (nickname !== undefined) userData.nickname = nickname;
      if (profileImageUrl !== undefined) userData.profileImageUrl = profileImageUrl;

      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: demoAccount.user.id },
          data: userData,
        });
      }

      if (memo !== undefined) {
        await tx.demoAccount.update({
          where: { id },
          data: { memo },
        });
      }
    });

    const updated = await this.prisma.read.demoAccount.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, nickname: true, profileImageUrl: true },
        },
      },
    });

    return {
      id: updated!.id,
      userId: updated!.user.id,
      nickname: updated!.user.nickname,
      profileImageUrl: updated!.user.profileImageUrl,
      memo: updated!.memo,
      createdAt: updated!.createdAt,
    };
  }

  /** 데모 계정 삭제 (User 삭제 → DemoAccount cascade 삭제) */
  async remove(id: string) {
    const demoAccount = await this.prisma.read.demoAccount.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!demoAccount) {
      throw new NotFoundException('데모 계정을 찾을 수 없습니다');
    }

    // User 삭제 시 DemoAccount도 onDelete: Cascade로 함께 삭제됨
    await this.prisma.write.user.delete({
      where: { id: demoAccount.userId },
    });

    return { success: true };
  }

  /** 데모 계정으로 로그인 (JWT 토큰 발급) */
  async loginAs(id: string) {
    const demoAccount = await this.prisma.read.demoAccount.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!demoAccount) {
      throw new NotFoundException('데모 계정을 찾을 수 없습니다');
    }

    // Account 레코드가 없으면 생성 (generateTokens가 Account.refreshToken을 업데이트하므로)
    const accountExists = await this.prisma.read.account.findFirst({
      where: { userId: demoAccount.userId },
    });
    if (!accountExists) {
      await this.prisma.write.account.create({
        data: {
          provider: 'demo',
          providerId: demoAccount.userId,
          userId: demoAccount.userId,
        },
      });
    }

    return this.authService.generateTokens(demoAccount.userId);
  }
}
