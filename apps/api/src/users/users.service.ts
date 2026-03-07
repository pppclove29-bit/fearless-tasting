import { Injectable, NotFoundException } from '@nestjs/common';
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
