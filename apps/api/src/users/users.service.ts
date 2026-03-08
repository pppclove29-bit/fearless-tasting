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

  /** 글로벌 랭킹 + 업적 조회 */
  async getRankings() {
    const users = await this.prisma.read.user.findMany({
      where: { role: 'user' },
      select: {
        id: true,
        nickname: true,
        profileImageUrl: true,
        createdVisits: {
          select: {
            id: true,
            restaurantId: true,
            visitedAt: true,
            participants: { select: { userId: true } },
            reviews: { select: { userId: true } },
          },
        },
        roomReviews: {
          select: {
            id: true,
            rating: true,
            content: true,
            tasteRating: true,
            valueRating: true,
            serviceRating: true,
            cleanlinessRating: true,
            accessibilityRating: true,
          },
        },
        roomRestaurants: { select: { id: true, category: true, neighborhood: true } },
        roomMembers: { select: { roomId: true } },
        visitParticipations: { select: { visit: { select: { restaurantId: true, visitedAt: true, reviews: { select: { userId: true } } } } } },
      },
    });

    const rankings = users.map((user) => {
      // 참여한 방문 (생성 + 참여자) — 식당별 방문 횟수 계산
      const restaurantVisitMap = new Map<string, number>();
      const allVisitDates: Date[] = [];
      let totalParticipatedVisits = 0;
      let reviewableVisits = 0;

      // 직접 생성한 방문
      for (const v of user.createdVisits) {
        restaurantVisitMap.set(v.restaurantId, (restaurantVisitMap.get(v.restaurantId) || 0) + 1);
        allVisitDates.push(new Date(v.visitedAt));
        totalParticipatedVisits++;
        reviewableVisits++;
      }

      // 참여자로 태그된 방문
      for (const p of user.visitParticipations) {
        restaurantVisitMap.set(p.visit.restaurantId, (restaurantVisitMap.get(p.visit.restaurantId) || 0) + 1);
        allVisitDates.push(new Date(p.visit.visitedAt));
        totalParticipatedVisits++;
        const hasMyReview = p.visit.reviews.some((r) => r.userId === user.id);
        if (!hasMyReview) reviewableVisits++;
      }

      const reviewCount = user.roomReviews.length;
      const visitCount = totalParticipatedVisits;
      const restaurantCount = user.roomRestaurants.length;
      const roomCount = user.roomMembers.length;

      // 평균 평점
      const avgRating = reviewCount > 0
        ? Math.round(user.roomReviews.reduce((s, r) => s + r.rating, 0) / reviewCount * 10) / 10
        : null;

      // 재방문율 (2회 이상 방문한 식당 비율)
      const totalVisitedRests = restaurantVisitMap.size;
      const revisitedRests = Array.from(restaurantVisitMap.values()).filter((c) => c >= 2).length;
      const revisitRate = totalVisitedRests > 0 ? Math.round(revisitedRests / totalVisitedRests * 100) : null;

      // 리뷰 성실도
      const reviewDiligence = visitCount > 0 ? Math.round(reviewCount / visitCount * 100) : null;

      // 카테고리 다양성
      const uniqueCategories = new Set(user.roomRestaurants.map((r) => r.category)).size;
      const uniqueNeighborhoods = new Set(user.roomRestaurants.map((r) => r.neighborhood).filter(Boolean)).size;

      // ── 업적 계산 ──
      const achievements: { id: string; name: string; icon: string; description: string }[] = [];

      // 방문 계열
      if (visitCount >= 1) achievements.push({ id: 'first-visit', name: '첫 발자국', icon: '👣', description: '첫 방문 달성' });
      if (visitCount >= 10) achievements.push({ id: 'visit-10', name: '동네 탐험가', icon: '🗺️', description: '10회 방문 달성' });
      if (visitCount >= 50) achievements.push({ id: 'visit-50', name: '미식 여행자', icon: '✈️', description: '50회 방문 달성' });
      if (visitCount >= 100) achievements.push({ id: 'visit-100', name: '전설의 미식가', icon: '👑', description: '100회 방문 달성' });

      // 리뷰 계열
      if (reviewCount >= 1) achievements.push({ id: 'first-review', name: '첫 한마디', icon: '💬', description: '첫 리뷰 작성' });
      if (reviewCount >= 10) achievements.push({ id: 'review-10', name: '리뷰 루키', icon: '📝', description: '리뷰 10개 작성' });
      if (reviewCount >= 50) achievements.push({ id: 'review-50', name: '리뷰 마스터', icon: '🏆', description: '리뷰 50개 작성' });
      if (reviewCount >= 100) achievements.push({ id: 'review-100', name: '리뷰의 신', icon: '⭐', description: '리뷰 100개 작성' });

      // 탐험 계열
      if (uniqueCategories >= 5) achievements.push({ id: 'cat-5', name: '잡식성', icon: '🌈', description: '5개 카테고리 방문' });
      if (uniqueCategories >= 10) achievements.push({ id: 'cat-10', name: '미식 박사', icon: '🎓', description: '10개 카테고리 정복' });
      if (restaurantCount >= 10) achievements.push({ id: 'rest-10', name: '맛집 수집가', icon: '📌', description: '10곳 식당 등록' });
      if (restaurantCount >= 50) achievements.push({ id: 'rest-50', name: '맛집 사전', icon: '📖', description: '50곳 식당 등록' });
      if (uniqueNeighborhoods >= 5) achievements.push({ id: 'hood-5', name: '동네 개척자', icon: '🏘️', description: '5개 동네 탐험' });
      if (uniqueNeighborhoods >= 10) achievements.push({ id: 'hood-10', name: '전국구', icon: '🇰🇷', description: '10개 동네 정복' });

      // 단골 계열
      if (revisitedRests >= 1) achievements.push({ id: 'revisit-1', name: '또 왔어요', icon: '🔁', description: '첫 재방문' });
      if (revisitedRests >= 5) achievements.push({ id: 'revisit-5', name: '단골 5곳', icon: '🏅', description: '5곳 재방문 달성' });
      if (revisitedRests >= 10) achievements.push({ id: 'revisit-10', name: '단골왕', icon: '💎', description: '10곳 재방문 달성' });

      // 성실 계열
      if (reviewDiligence !== null && reviewDiligence >= 100 && visitCount >= 10) {
        achievements.push({ id: 'all-review', name: '올 리뷰어', icon: '🎯', description: '방문마다 빠짐없이 리뷰' });
      }

      // 소셜 계열
      if (roomCount >= 3) achievements.push({ id: 'social-3', name: '소셜 미식가', icon: '🤝', description: '3개 방 참여' });
      if (roomCount >= 5) achievements.push({ id: 'social-5', name: '인싸 미식가', icon: '🎉', description: '5개 방 참여' });

      return {
        userId: user.id,
        nickname: user.nickname,
        profileImageUrl: user.profileImageUrl,
        reviewCount,
        visitCount,
        restaurantCount,
        roomCount,
        avgRating,
        revisitRate,
        reviewDiligence,
        uniqueCategories,
        achievements,
      };
    });

    return {
      rankings: rankings.sort((a, b) => b.reviewCount - a.reviewCount),
      totalUsers: rankings.length,
    };
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
