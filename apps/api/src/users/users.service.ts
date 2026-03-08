import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** 사용자 목록 조회 */
  async findAll() {
    return this.prisma.read.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 사용자 단건 조회 */
  async findOne(id: string) {
    const user = await this.prisma.read.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  /** 닉네임 수정 */
  async updateNickname(userId: string, nickname: string) {
    const existing = await this.prisma.read.user.findFirst({
      where: { nickname, NOT: { id: userId } },
    });
    if (existing) {
      throw new ConflictException('이미 사용 중인 닉네임입니다');
    }

    return this.prisma.write.user.update({
      where: { id: userId },
      data: { nickname },
      select: { id: true, email: true, nickname: true, role: true, profileImageUrl: true },
    });
  }

  /** 회원 탈퇴 (방장인 방이 있으면 거부) */
  async deleteAccount(userId: string) {
    const ownedRoom = await this.prisma.read.room.findFirst({
      where: { ownerId: userId },
      select: { id: true, name: true },
    });
    if (ownedRoom) {
      throw new ForbiddenException(
        `방장인 방(${ownedRoom.name})이 있습니다. 방장을 위임하거나 방을 삭제한 후 탈퇴해주세요.`,
      );
    }

    await this.prisma.write.user.delete({ where: { id: userId } });
  }

  /** 관리자 대시보드 통계 */
  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, dau, wau, mau, totalRooms, totalRoomRestaurants, totalRoomReviews] =
      await Promise.all([
        this.prisma.read.user.count(),
        this.prisma.read.user.count({ where: { lastActiveAt: { gte: todayStart } } }),
        this.prisma.read.user.count({ where: { lastActiveAt: { gte: sevenDaysAgo } } }),
        this.prisma.read.user.count({ where: { lastActiveAt: { gte: thirtyDaysAgo } } }),
        this.prisma.read.room.count(),
        this.prisma.read.roomRestaurant.count(),
        this.prisma.read.roomReview.count(),
      ]);

    return { totalUsers, dau, wau, mau, totalRooms, totalRoomRestaurants, totalRoomReviews };
  }
}
