import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 평균 평점 계산 (소수점 1자리 반올림). 빈 배열이면 null 반환. */
function calcAvgRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class RoomStatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 플랫폼 공개 통계 (비로그인 가능) */
  async getPlatformStats() {
    const [roomCount, userCount, restaurantCount, reviewCount] = await Promise.all([
      this.prisma.read.room.count(),
      this.prisma.read.user.count(),
      this.prisma.read.roomRestaurant.count(),
      this.prisma.read.roomReview.count(),
    ]);
    return { roomCount, userCount, restaurantCount, reviewCount };
  }

  /** 방 전체 통계 조회 */
  async getRoomStats(roomId: string, userId: string) {
    const room = await this.prisma.read.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: { select: { id: true, nickname: true, profileImageUrl: true } } },
        },
        restaurants: {
          select: {
            id: true, name: true, category: true, province: true, city: true, neighborhood: true,
            visits: {
              select: {
                id: true, visitedAt: true, waitTime: true, createdById: true,
                participants: { select: { userId: true } },
                reviews: {
                  select: {
                    id: true, rating: true, wouldRevisit: true, userId: true,
                    tasteRating: true, valueRating: true, serviceRating: true,
                    cleanlinessRating: true, accessibilityRating: true,
                    favoriteMenu: true, tryNextMenu: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');

    const allVisits = room.restaurants.flatMap((r) => r.visits.map((v) => ({ ...v, restaurantName: r.name, restaurantId: r.id })));
    const allReviews = allVisits.flatMap((v) => v.reviews);

    // ─── 기본 요약 ───
    const totalRestaurants = room.restaurants.length;
    const totalVisits = allVisits.length;
    const totalReviews = allReviews.length;
    const overallAvg = calcAvgRating(allReviews.map((r) => r.rating));

    // ─── 멤버별 통계 ───
    const memberMap = new Map<string, { nickname: string; reviews: typeof allReviews; visitCount: number }>();
    for (const m of room.members) {
      memberMap.set(m.userId, { nickname: m.user.nickname, reviews: [], visitCount: 0 });
    }
    for (const review of allReviews) {
      const entry = memberMap.get(review.userId);
      if (entry) entry.reviews.push(review);
    }
    for (const visit of allVisits) {
      if (visit.createdById) {
        const entry = memberMap.get(visit.createdById);
        if (entry) entry.visitCount++;
      }
      for (const p of visit.participants) {
        const entry = memberMap.get(p.userId);
        if (entry && p.userId !== visit.createdById) entry.visitCount++;
      }
    }

    // 단일 패스로 멤버별 식당 방문 횟수 사전 계산: userId → restaurantId → count
    const userRestVisitMap = new Map<string, Map<string, number>>();
    for (const rest of room.restaurants) {
      for (const visit of rest.visits) {
        const participantIds = new Set<string>();
        if (visit.createdById) participantIds.add(visit.createdById);
        for (const p of visit.participants) participantIds.add(p.userId);
        for (const uid of participantIds) {
          let restMap = userRestVisitMap.get(uid);
          if (!restMap) { restMap = new Map(); userRestVisitMap.set(uid, restMap); }
          restMap.set(rest.id, (restMap.get(rest.id) || 0) + 1);
        }
      }
    }

    const memberStats = Array.from(memberMap.entries())
      .map(([uid, data]) => {
        const avg = calcAvgRating(data.reviews.map((r) => r.rating));
        const visitedRestMap = userRestVisitMap.get(uid);
        const totalVisitedRests = visitedRestMap?.size ?? 0;
        const revisitedRests = visitedRestMap
          ? Array.from(visitedRestMap.values()).filter((c) => c >= 2).length
          : 0;
        const revisitRate = totalVisitedRests > 0
          ? Math.round(revisitedRests / totalVisitedRests * 100)
          : null;
        return {
          userId: uid,
          nickname: data.nickname,
          reviewCount: data.reviews.length,
          visitCount: data.visitCount,
          avgRating: avg,
          revisitRate,
        };
      })
      .sort((a, b) => b.reviewCount - a.reviewCount);

    // ─── 카테고리별 통계 ───
    const catMap = new Map<string, { count: number; ratings: number[] }>();
    for (const r of room.restaurants) {
      const ratings = r.visits.flatMap((v) => v.reviews.map((rev) => rev.rating));
      const entry = catMap.get(r.category);
      if (entry) { entry.count++; entry.ratings.push(...ratings); }
      else catMap.set(r.category, { count: 1, ratings });
    }
    const categoryStats = Array.from(catMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        avgRating: calcAvgRating(data.ratings),
      }))
      .sort((a, b) => b.count - a.count);

    // ─── 지역별 통계 ───
    const regionMap = new Map<string, { count: number; ratings: number[] }>();
    for (const r of room.restaurants) {
      const key = r.neighborhood || r.city;
      const ratings = r.visits.flatMap((v) => v.reviews.map((rev) => rev.rating));
      const entry = regionMap.get(key);
      if (entry) { entry.count++; entry.ratings.push(...ratings); }
      else regionMap.set(key, { count: 1, ratings });
    }
    const regionStats = Array.from(regionMap.entries())
      .map(([region, data]) => ({
        region,
        count: data.count,
        avgRating: calcAvgRating(data.ratings),
      }))
      .sort((a, b) => b.count - a.count);

    // ─── 세부 평점 평균 (레이더 차트용) ───
    const detailFields = ['tasteRating', 'valueRating', 'serviceRating', 'cleanlinessRating', 'accessibilityRating'] as const;
    const detailRatingAvg: Record<string, number | null> = {};
    for (const field of detailFields) {
      const vals = allReviews.map((r) => r[field]).filter((v): v is number => v !== null);
      detailRatingAvg[field] = calcAvgRating(vals);
    }

    // ─── 월별 방문 트렌드 ───
    const monthMap = new Map<string, number>();
    for (const v of allVisits) {
      const month = new Date(v.visitedAt).toISOString().slice(0, 7);
      monthMap.set(month, (monthMap.get(month) || 0) + 1);
    }
    const monthlyVisits = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // ─── 요일별 방문 분포 ───
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // 일~토
    for (const v of allVisits) {
      const day = new Date(v.visitedAt).getDay();
      dayOfWeekCounts[day]++;
    }

    // ─── 웨이팅 분포 ───
    const waitTimeMap = new Map<string, number>();
    for (const v of allVisits) {
      if (v.waitTime) {
        waitTimeMap.set(v.waitTime, (waitTimeMap.get(v.waitTime) || 0) + 1);
      }
    }
    const waitTimeStats = Array.from(waitTimeMap.entries())
      .map(([waitTime, count]) => ({ waitTime, count }))
      .sort((a, b) => b.count - a.count);

    // ─── 인기 메뉴 ───
    const favMenuMap = new Map<string, number>();
    const tryMenuMap = new Map<string, number>();
    for (const r of allReviews) {
      if (r.favoriteMenu) favMenuMap.set(r.favoriteMenu, (favMenuMap.get(r.favoriteMenu) || 0) + 1);
      if (r.tryNextMenu) tryMenuMap.set(r.tryNextMenu, (tryMenuMap.get(r.tryNextMenu) || 0) + 1);
    }
    const topFavoriteMenus = Array.from(favMenuMap.entries())
      .map(([menu, count]) => ({ menu, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const topTryNextMenus = Array.from(tryMenuMap.entries())
      .map(([menu, count]) => ({ menu, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ─── 재방문 TOP 식당 (실제 방문 2회 이상) ───
    const topRevisitRestaurants = room.restaurants
      .map((r) => ({ name: r.name, visitCount: r.visits.length }))
      .filter((r) => r.visitCount >= 2)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5);

    // ─── 식당별 평균 평점 TOP/BOTTOM ───
    const restaurantRatings = room.restaurants
      .map((r) => {
        const ratings = r.visits.flatMap((v) => v.reviews.map((rev) => rev.rating));
        return {
          name: r.name,
          avgRating: calcAvgRating(ratings),
          reviewCount: ratings.length,
        };
      })
      .filter((r) => r.avgRating !== null && r.reviewCount >= 1);

    const topRatedRestaurants = [...restaurantRatings].sort((a, b) => b.avgRating! - a.avgRating!).slice(0, 5);
    const bottomRatedRestaurants = [...restaurantRatings].sort((a, b) => a.avgRating! - b.avgRating!).slice(0, 5);

    // ─── 리뷰 안 쓴 방문 (현재 유저) ───
    const unreviewedVisits = allVisits
      .filter((v) => {
        const isParticipant = v.createdById === userId || v.participants.some((p) => p.userId === userId);
        const hasMyReview = v.reviews.some((r) => r.userId === userId);
        return isParticipant && !hasMyReview;
      })
      .map((v) => ({ visitId: v.id, restaurantName: v.restaurantName, visitedAt: v.visitedAt }))
      .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
      .slice(0, 10);

    // ─── 멤버 행동 분석 ───
    const { memberBehaviors, bestCombos } = this.analyzeMemberBehaviors(room.restaurants, allVisits, memberMap, userRestVisitMap);

    // ─── 방 행동 분석 ───
    const { activityTrend, ratingInflation, staleRestaurants, diversityIndex, waitTolerance, peakMonth } =
      this.analyzeRoomBehaviors(room.restaurants, allVisits, catMap, monthlyVisits);

    return {
      summary: { totalRestaurants, totalVisits, totalReviews, overallAvg },
      memberStats,
      categoryStats,
      regionStats,
      detailRatingAvg,
      monthlyVisits,
      dayOfWeekVisits: dayOfWeekCounts,
      waitTimeStats,
      topFavoriteMenus,
      topTryNextMenus,
      topRevisitRestaurants,
      topRatedRestaurants,
      bottomRatedRestaurants,
      unreviewedVisits,
      memberBehaviors,
      bestCombos,
      activityTrend,
      ratingInflation,
      staleRestaurants,
      diversityIndex,
      waitTolerance,
      peakMonth,
    };
  }

  // ─── 통계 헬퍼 ───

  private analyzeMemberBehaviors(
    restaurants: { id: string; category: string; visits: { visitedAt: Date; createdById: string | null; participants: { userId: string }[]; reviews: { rating: number; userId: string; tasteRating: number | null; valueRating: number | null; serviceRating: number | null; cleanlinessRating: number | null; accessibilityRating: number | null }[] }[] }[],
    allVisits: { createdById: string | null; participants: { userId: string }[] }[],
    memberMap: Map<string, { nickname: string; reviews: { rating: number; tasteRating: number | null; valueRating: number | null; serviceRating: number | null; cleanlinessRating: number | null; accessibilityRating: number | null }[] }>,
    userRestVisitMap: Map<string, Map<string, number>>,
  ) {
    // 단일 패스로 멤버별 카테고리 + 요일 집계
    const memberVisitMeta = new Map<string, { catCounts: Map<string, number>; visitCount: number; weekday: number; weekend: number }>();
    for (const rest of restaurants) {
      for (const visit of rest.visits) {
        const participantIds = new Set<string>();
        if (visit.createdById) participantIds.add(visit.createdById);
        for (const p of visit.participants) participantIds.add(p.userId);
        const day = new Date(visit.visitedAt).getDay();
        const isWeekend = day === 0 || day === 6;
        for (const uid of participantIds) {
          if (!memberMap.has(uid)) continue;
          let meta = memberVisitMeta.get(uid);
          if (!meta) { meta = { catCounts: new Map(), visitCount: 0, weekday: 0, weekend: 0 }; memberVisitMeta.set(uid, meta); }
          meta.visitCount++;
          meta.catCounts.set(rest.category, (meta.catCounts.get(rest.category) || 0) + 1);
          if (isWeekend) meta.weekend++; else meta.weekday++;
        }
      }
    }

    const memberBehaviors = Array.from(memberMap.entries()).map(([uid, data]) => {
      const meta = memberVisitMeta.get(uid);
      const catCounts = meta?.catCounts ?? new Map<string, number>();
      const memberVisitCount = meta?.visitCount ?? 0;
      const weekdayCount = meta?.weekday ?? 0;
      const weekendCount = meta?.weekend ?? 0;

      // 탐험가 vs 단골러 (사전 계산된 userRestVisitMap 활용)
      const restVisitMap = userRestVisitMap.get(uid);
      const totalRests = restVisitMap?.size ?? 0;
      const revisitedRests = restVisitMap
        ? Array.from(restVisitMap.values()).filter((c) => c >= 2).length
        : 0;
      const explorerRate = totalRests > 0 ? Math.round((totalRests - revisitedRests) / totalRests * 100) : null;

      // 카테고리 편식도
      const totalCatVisits = Array.from(catCounts.values()).reduce((s, c) => s + c, 0);
      const topCat = Array.from(catCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      const topCatRate = topCat && totalCatVisits > 0 ? Math.round(topCat[1] / totalCatVisits * 100) : null;
      const categoryBias = topCat ? { category: topCat[0], rate: topCatRate, uniqueCategories: catCounts.size } : null;

      // 평가 성향
      const detailAvgs: { field: string; label: string; avg: number }[] = [];
      const fieldLabels: Record<string, string> = {
        tasteRating: '맛', valueRating: '가성비', serviceRating: '서비스',
        cleanlinessRating: '청결', accessibilityRating: '접근성',
      };
      for (const [field, label] of Object.entries(fieldLabels)) {
        const vals = data.reviews.map((r) => r[field as keyof typeof r]).filter((v): v is number => v !== null && typeof v === 'number');
        if (vals.length > 0) detailAvgs.push({ field, label, avg: calcAvgRating(vals)! });
      }
      const generous = detailAvgs.length > 0 ? detailAvgs.reduce((a, b) => a.avg > b.avg ? a : b) : null;
      const strict = detailAvgs.length > 0 ? detailAvgs.reduce((a, b) => a.avg < b.avg ? a : b) : null;
      const ratingTendency = generous && strict && generous.field !== strict.field
        ? { generousOn: generous.label, generousAvg: generous.avg, strictOn: strict.label, strictAvg: strict.avg }
        : null;

      // 리뷰 성실도
      const reviewDiligence = memberVisitCount > 0 ? Math.round(data.reviews.length / memberVisitCount * 100) : null;

      // 주말파 vs 평일파
      const dayPreference = (weekdayCount + weekendCount) > 0
        ? { weekday: weekdayCount, weekend: weekendCount, type: weekendCount > weekdayCount ? 'weekend' as const : weekdayCount > weekendCount ? 'weekday' as const : 'balanced' as const }
        : null;

      return { userId: uid, nickname: data.nickname, explorerRate, categoryBias, ratingTendency, reviewDiligence, dayPreference };
    });

    // 베스트 콤비
    const comboCounts = new Map<string, { userA: string; nickA: string; userB: string; nickB: string; count: number }>();
    for (const visit of allVisits) {
      const participantIds = [
        ...(visit.createdById ? [visit.createdById] : []),
        ...visit.participants.map((p) => p.userId),
      ].filter((id, idx, arr) => arr.indexOf(id) === idx);

      for (let i = 0; i < participantIds.length; i++) {
        for (let j = i + 1; j < participantIds.length; j++) {
          const [a, b] = [participantIds[i], participantIds[j]].sort();
          const key = `${a}:${b}`;
          const existing = comboCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            const nickA = memberMap.get(a)?.nickname || '알 수 없음';
            const nickB = memberMap.get(b)?.nickname || '알 수 없음';
            comboCounts.set(key, { userA: a, nickA, userB: b, nickB, count: 1 });
          }
        }
      }
    }
    const bestCombos = Array.from(comboCounts.values()).sort((a, b) => b.count - a.count).slice(0, 3);

    return { memberBehaviors, bestCombos };
  }

  private analyzeRoomBehaviors(
    restaurants: { name: string; visits: { visitedAt: Date; waitTime: string | null; reviews: { rating: number }[] }[] }[],
    allVisits: { visitedAt: Date; waitTime: string | null; reviews: { rating: number }[] }[],
    catMap: Map<string, { count: number; ratings: number[] }>,
    monthlyVisits: { month: string; count: number }[],
  ) {
    const now = new Date();

    // 활성도 트렌드
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const recentCount = allVisits.filter((v) => new Date(v.visitedAt) >= threeMonthsAgo).length;
    const prevCount = allVisits.filter((v) => { const d = new Date(v.visitedAt); return d >= sixMonthsAgo && d < threeMonthsAgo; }).length;
    const activityTrend = prevCount > 0
      ? { recent: recentCount, previous: prevCount, changeRate: Math.round((recentCount - prevCount) / prevCount * 100) }
      : { recent: recentCount, previous: prevCount, changeRate: null };

    // 평점 인플레이션
    const sortedVisits = [...allVisits].sort((a, b) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime());
    const mid = Math.floor(sortedVisits.length / 2);
    let ratingInflation: { earlyAvg: number; lateAvg: number; change: number } | null = null;
    if (sortedVisits.length >= 4) {
      const earlyReviews = sortedVisits.slice(0, mid).flatMap((v) => v.reviews);
      const lateReviews = sortedVisits.slice(mid).flatMap((v) => v.reviews);
      if (earlyReviews.length > 0 && lateReviews.length > 0) {
        const earlyAvg = calcAvgRating(earlyReviews.map((r) => r.rating))!;
        const lateAvg = calcAvgRating(lateReviews.map((r) => r.rating))!;
        ratingInflation = { earlyAvg, lateAvg, change: Math.round((lateAvg - earlyAvg) * 10) / 10 };
      }
    }

    // 최장 미방문 식당
    const staleRestaurants = restaurants
      .filter((r) => r.visits.length > 0)
      .map((r) => {
        const lastVisit = r.visits.reduce((latest, v) =>
          new Date(v.visitedAt) > new Date(latest.visitedAt) ? v : latest, r.visits[0]);
        const daysSince = Math.floor((now.getTime() - new Date(lastVisit.visitedAt).getTime()) / MS_PER_DAY);
        return { name: r.name, lastVisitedAt: lastVisit.visitedAt, daysSince };
      })
      .filter((r) => r.daysSince >= 14)
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 5);

    // 카테고리 다양성 지수
    const totalCatCount = Array.from(catMap.values()).reduce((s, d) => s + d.count, 0);
    let diversityIndex: number | null = null;
    if (totalCatCount > 1 && catMap.size > 1) {
      const simpson = Array.from(catMap.values()).reduce((s, d) => s + (d.count / totalCatCount) ** 2, 0);
      diversityIndex = Math.round((1 - simpson) * 100);
    }

    // 웨이팅 감수 지수
    const visitsWithWait = allVisits.filter((v) => v.waitTime && v.waitTime !== '없음' && v.waitTime !== '0분').length;
    const waitTolerance = allVisits.length > 0 ? Math.round(visitsWithWait / allVisits.length * 100) : null;

    // 가장 활발한 월
    const peakMonth = monthlyVisits.length > 0 ? monthlyVisits.reduce((a, b) => a.count > b.count ? a : b) : null;

    return { activityTrend, ratingInflation, staleRestaurants, diversityIndex, waitTolerance, peakMonth };
  }
}
