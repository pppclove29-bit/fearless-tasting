export interface RankingUser {
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  reviewCount: number;
  visitCount: number;
  restaurantCount: number;
  roomCount: number;
  avgRating: number | null;
  revisitRate: number | null;
  reviewDiligence: number | null;
  uniqueCategories: number;
  achievements: { id: string; name: string; icon: string; description: string }[];
}

export interface RankingsResponse {
  rankings: RankingUser[];
  totalUsers: number;
}
