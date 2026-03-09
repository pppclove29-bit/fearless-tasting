import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
        roomRestaurants: { select: { id: true, category: true, neighborhood: true, province: true } },
        roomMembers: { select: { roomId: true } },
        ownedRooms: {
          select: {
            id: true,
            shareCode: true,
            shareCodeEnabled: true,
            members: { select: { id: true } },
          },
        },
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
      const uniqueProvinces = new Set(user.roomRestaurants.map((r) => r.province).filter(Boolean)).size;
      const uniqueCities = new Set(user.roomRestaurants.map((r) => `${r.province}|${r.neighborhood}`).filter((v) => !v.startsWith('|'))).size;

      // 동네별 식당 수 (local-expert용)
      const hoodCountMap = new Map<string, number>();
      for (const r of user.roomRestaurants) {
        if (r.neighborhood) hoodCountMap.set(r.neighborhood, (hoodCountMap.get(r.neighborhood) || 0) + 1);
      }
      const maxHoodCount = hoodCountMap.size > 0 ? Math.max(...Array.from(hoodCountMap.values())) : 0;

      // 별점 분석
      const ratings = user.roomReviews.map((r) => r.rating);
      const ratingSet = new Set(ratings);
      const perfect5Count = ratings.filter((r) => r === 5).length;

      // 세부 별점 분석
      const detailFields = ['tasteRating', 'valueRating', 'serviceRating', 'cleanlinessRating', 'accessibilityRating'] as const;
      let fullDetailReviews = 0;
      let cleanlinessAlwaysFilled = true;
      let cleanlinessFilledCount = 0;
      const detailAvgs: Record<string, { sum: number; count: number }> = {};
      for (const field of detailFields) {
        detailAvgs[field] = { sum: 0, count: 0 };
      }

      for (const review of user.roomReviews) {
        let allFilled = true;
        for (const field of detailFields) {
          if (review[field] != null) {
            detailAvgs[field].sum += review[field]!;
            detailAvgs[field].count++;
          } else {
            allFilled = false;
          }
        }
        if (allFilled) fullDetailReviews++;
        if (review.cleanlinessRating != null) cleanlinessFilledCount++;
        else cleanlinessAlwaysFilled = false;
      }

      const tasteAvg = detailAvgs.tasteRating.count >= 10 ? detailAvgs.tasteRating.sum / detailAvgs.tasteRating.count : null;
      const valueAvg = detailAvgs.valueRating.count >= 10 ? detailAvgs.valueRating.sum / detailAvgs.valueRating.count : null;

      // 방장 정보 분석
      const ownedRoomCount = user.ownedRooms.length;
      const hasSharedRoom = user.ownedRooms.some((r) => r.shareCode && r.shareCodeEnabled);
      const maxMembersInOwnedRoom = user.ownedRooms.reduce((max, r) => Math.max(max, r.members.length), 0);

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

      // 별점 계열
      if (avgRating !== null && avgRating >= 4.5 && reviewCount >= 10) achievements.push({ id: 'avg-high', name: '후한 평가자', icon: '😊', description: '평균 별점 4.5 이상' });
      if (avgRating !== null && avgRating <= 2.5 && reviewCount >= 10) achievements.push({ id: 'avg-strict', name: '깐깐한 미식가', icon: '🧐', description: '기준이 확실한 미식가' });
      if (perfect5Count >= 10) achievements.push({ id: 'perfect-5', name: '만점 사냥꾼', icon: '💯', description: '5점 리뷰 10개 달성' });
      if (ratingSet.size >= 5) achievements.push({ id: 'all-range', name: '풀 스펙트럼', icon: '🌡️', description: '1~5점 모두 사용' });

      // 세부 별점 계열
      if (fullDetailReviews >= 10) achievements.push({ id: 'detail-master', name: '꼼꼼한 리뷰어', icon: '🔍', description: '세부 평가 5개 모두 기록 10회' });
      if (tasteAvg !== null && tasteAvg >= 4.5) achievements.push({ id: 'taste-lover', name: '맛에 진심', icon: '👅', description: '맛 별점 평균 4.5 이상' });
      if (cleanlinessAlwaysFilled && cleanlinessFilledCount >= 10) achievements.push({ id: 'clean-freak', name: '위생 전문가', icon: '🧹', description: '청결도를 항상 체크' });
      if (valueAvg !== null && valueAvg >= 4.5) achievements.push({ id: 'value-hunter', name: '가성비 헌터', icon: '💰', description: '가성비 별점 평균 4.5 이상' });

      // 탐험 계열
      if (uniqueCategories >= 5) achievements.push({ id: 'cat-5', name: '잡식성', icon: '🌈', description: '5개 카테고리 방문' });
      if (uniqueCategories >= 10) achievements.push({ id: 'cat-10', name: '미식 박사', icon: '🎓', description: '10개 카테고리 정복' });
      if (restaurantCount >= 10) achievements.push({ id: 'rest-10', name: '맛집 수집가', icon: '📌', description: '10곳 식당 등록' });
      if (restaurantCount >= 50) achievements.push({ id: 'rest-50', name: '맛집 사전', icon: '📖', description: '50곳 식당 등록' });
      if (uniqueNeighborhoods >= 5) achievements.push({ id: 'hood-5', name: '동네 개척자', icon: '🏘️', description: '5개 동네 탐험' });
      if (uniqueNeighborhoods >= 10) achievements.push({ id: 'hood-10', name: '전국구', icon: '🇰🇷', description: '10개 동네 정복' });
      if (uniqueNeighborhoods >= 20) achievements.push({ id: 'hood-20', name: '골목 대장', icon: '🏘️', description: '20개 동네 정복' });

      // 지역 계열
      if (uniqueProvinces >= 3) achievements.push({ id: 'province-3', name: '시도 탐험가', icon: '🚗', description: '3개 시/도 방문' });
      if (uniqueProvinces >= 5) achievements.push({ id: 'province-5', name: '전국 미식 투어', icon: '🚄', description: '5개 시/도 방문' });
      if (uniqueCities >= 10) achievements.push({ id: 'city-10', name: '도시 정복자', icon: '🏙️', description: '10개 지역 정복' });
      if (maxHoodCount >= 10) achievements.push({ id: 'local-expert', name: '동네 전문가', icon: '📍', description: '한 동네에서 10곳 등록' });

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

      // 공유 및 초대 계열
      if (ownedRoomCount >= 1) achievements.push({ id: 'room-creator', name: '방 개설자', icon: '🏠', description: '첫 방 개설' });
      if (ownedRoomCount >= 3) achievements.push({ id: 'room-builder', name: '방 빌더', icon: '🏗️', description: '방 3개 이상 개설' });
      if (hasSharedRoom) achievements.push({ id: 'share-master', name: '공유의 달인', icon: '🔗', description: '맛집 리스트를 세상에 공개' });
      if (maxMembersInOwnedRoom >= 5) achievements.push({ id: 'inviter', name: '초대왕', icon: '📨', description: '방에 5명 이상 초대' });

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

    const sorted = rankings.sort((a, b) => b.reviewCount - a.reviewCount);

    // 랭킹 기반 업적 (정렬 후 부여)
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].reviewCount === 0) continue;
      if (i === 0) sorted[i].achievements.push({ id: 'number-1', name: '넘버원', icon: '🥇', description: '리뷰 수 전체 1위' });
      if (i < 3) sorted[i].achievements.push({ id: 'top-3', name: '탑 3', icon: '🥉', description: '리뷰 수 상위 3위' });
      if (i < 10) sorted[i].achievements.push({ id: 'top-10', name: '탑 10', icon: '🏅', description: '리뷰 수 상위 10위' });
    }

    // 라이징 스타 — 최근 30일 방문 수 1위
    const thirtyDaysAgoDate = new Date(Date.now() - THIRTY_DAYS_MS);
    const recentVisitCounts = users.map((u) => ({
      id: u.id,
      count: u.createdVisits.filter((v) => new Date(v.visitedAt) >= thirtyDaysAgoDate).length,
    }));
    const maxRecentVisits = Math.max(...recentVisitCounts.map((r) => r.count), 0);
    if (maxRecentVisits >= 3) {
      const risingStarId = recentVisitCounts.find((r) => r.count === maxRecentVisits)?.id;
      const risingStar = sorted.find((r) => r.userId === risingStarId);
      if (risingStar) {
        risingStar.achievements.push({ id: 'rising-star', name: '라이징 스타', icon: '🌟', description: '최근 30일 가장 활발한 활동' });
      }
    }

    return {
      rankings: sorted,
      totalUsers: sorted.length,
    };
  }

  /** 내가 찜한 식당 목록 */
  async getMyWishlists(userId: string) {
    return this.prisma.read.roomWishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        roomRestaurant: {
          select: {
            id: true,
            name: true,
            category: true,
            address: true,
            roomId: true,
            room: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /** 관리자 대시보드 통계 */
  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart.getTime() - SEVEN_DAYS_MS);
    const thirtyDaysAgo = new Date(todayStart.getTime() - THIRTY_DAYS_MS);

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
