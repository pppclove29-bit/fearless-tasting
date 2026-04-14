import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** 이메일로 유저 검색 (정확 일치) */
  async searchUserByEmail(email: string) {
    const user = await this.prisma.read.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        profileImageUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('해당 이메일의 유저를 찾을 수 없습니다.');
    }

    return user;
  }

  /** 유저 역할 변경 (자기 자신은 변경 불가) */
  async updateUserRole(userId: string, role: string, requesterId: string) {
    if (userId === requesterId) {
      throw new ForbiddenException('자기 자신의 권한은 변경할 수 없습니다.');
    }

    const user = await this.prisma.read.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    const updated = await this.prisma.write.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        profileImageUrl: true,
        createdAt: true,
      },
    });

    return updated;
  }
}
