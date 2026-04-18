import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** N일 전 자정 (시작) */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** YYYY-MM-DD (로컬) */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 최근 N일간의 날짜 배열 (오래된 → 최신) */
function last14Dates(): string[] {
  const arr: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    arr.push(dateKey(d));
  }
  return arr;
}

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 대시보드 KPI */
  async getDashboard() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const weekStart = daysAgo(7);
    const fourteenDaysAgo = daysAgo(13);

    const [
      totalUsers,
      dau,
      wau,
      mau,
      newUsersThisWeek,
      totalRooms,
      newRoomsThisWeek,
      totalRestaurants,
      newRestaurantsThisWeek,
      wishlistRestaurants,
      totalVisits,
      newVisitsThisWeek,
      totalReviews,
      newReviewsThisWeek,
      totalPosts,
      newPostsThisWeek,
      // 최근 14일 가입자/방문/리뷰 raw 데이터 (JS에서 날짜별 집계)
      recentSignups,
      recentVisits,
      recentReviews,
    ] = await Promise.all([
      this.prisma.read.user.count(),
      this.prisma.read.user.count({ where: { lastActiveAt: { gte: oneDayAgo } } }),
      this.prisma.read.user.count({ where: { lastActiveAt: { gte: sevenDaysAgo } } }),
      this.prisma.read.user.count({ where: { lastActiveAt: { gte: thirtyDaysAgo } } }),
      this.prisma.read.user.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.read.room.count(),
      this.prisma.read.room.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.read.roomRestaurant.count(),
      this.prisma.read.roomRestaurant.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.read.roomRestaurant.count({ where: { isWishlist: true } }),
      this.prisma.read.roomVisit.count(),
      this.prisma.read.roomVisit.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.read.roomReview.count(),
      this.prisma.read.roomReview.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.read.post.count(),
      this.prisma.read.post.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.read.user.findMany({
        where: { createdAt: { gte: fourteenDaysAgo } },
        select: { createdAt: true },
      }),
      this.prisma.read.roomVisit.findMany({
        where: { createdAt: { gte: fourteenDaysAgo } },
        select: { createdAt: true },
      }),
      this.prisma.read.roomReview.findMany({
        where: { createdAt: { gte: fourteenDaysAgo } },
        select: { createdAt: true },
      }),
    ]);

    // 날짜별 카운트 맵 구성
    const dates = last14Dates();
    const signupMap: Record<string, number> = Object.fromEntries(dates.map((d) => [d, 0]));
    const visitMap: Record<string, number> = { ...signupMap };
    const reviewMap: Record<string, number> = { ...signupMap };

    for (const row of recentSignups) {
      const key = dateKey(row.createdAt);
      if (key in signupMap) signupMap[key]++;
    }
    for (const row of recentVisits) {
      const key = dateKey(row.createdAt);
      if (key in visitMap) visitMap[key]++;
    }
    for (const row of recentReviews) {
      const key = dateKey(row.createdAt);
      if (key in reviewMap) reviewMap[key]++;
    }

    return {
      users: { total: totalUsers, dau, wau, mau, newThisWeek: newUsersThisWeek },
      rooms: { total: totalRooms, newThisWeek: newRoomsThisWeek },
      restaurants: {
        total: totalRestaurants,
        newThisWeek: newRestaurantsThisWeek,
        wishlist: wishlistRestaurants,
      },
      visits: { total: totalVisits, newThisWeek: newVisitsThisWeek },
      reviews: { total: totalReviews, newThisWeek: newReviewsThisWeek },
      posts: { total: totalPosts, newThisWeek: newPostsThisWeek },
      daily: {
        signups: dates.map((d) => ({ date: d, count: signupMap[d] })),
        activity: dates.map((d) => ({ date: d, visits: visitMap[d], reviews: reviewMap[d] })),
      },
    };
  }
}
