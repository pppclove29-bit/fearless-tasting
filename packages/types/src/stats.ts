export interface RoomStats {
  summary: { totalRestaurants: number; totalVisits: number; totalReviews: number; overallAvg: number | null };
  memberStats: { userId: string; nickname: string; reviewCount: number; visitCount: number; avgRating: number | null; revisitRate: number | null }[];
  categoryStats: { category: string; count: number; avgRating: number | null }[];
  regionStats: { region: string; count: number; avgRating: number | null }[];
  detailRatingAvg: Record<string, number | null>;
  monthlyVisits: { month: string; count: number }[];
  dayOfWeekVisits: number[];
  waitTimeStats: { waitTime: string; count: number }[];
  topFavoriteMenus: { menu: string; count: number }[];
  topTryNextMenus: { menu: string; count: number }[];
  topRevisitRestaurants: { name: string; visitCount: number }[];
  topRatedRestaurants: { name: string; avgRating: number | null; reviewCount: number }[];
  bottomRatedRestaurants: { name: string; avgRating: number | null; reviewCount: number }[];
  unreviewedVisits: { visitId: string; restaurantName: string; visitedAt: string }[];
  memberBehaviors: {
    userId: string; nickname: string; explorerRate: number | null;
    categoryBias: { category: string; rate: number | null; uniqueCategories: number } | null;
    ratingTendency: { generousOn: string; generousAvg: number; strictOn: string; strictAvg: number } | null;
    reviewDiligence: number | null;
    dayPreference: { weekday: number; weekend: number; type: 'weekend' | 'weekday' | 'balanced' } | null;
  }[];
  bestCombos: { nickA: string; nickB: string; count: number }[];
  activityTrend: { recent: number; previous: number; changeRate: number | null };
  ratingInflation: { earlyAvg: number; lateAvg: number; change: number } | null;
  staleRestaurants: { name: string; lastVisitedAt: string; daysSince: number }[];
  diversityIndex: number | null;
  waitTolerance: number | null;
  peakMonth: { month: string; count: number } | null;
}

export interface PlatformStats {
  roomCount: number;
  userCount: number;
  restaurantCount: number;
  reviewCount: number;
}
