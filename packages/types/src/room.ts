export type RoomRole = 'owner' | 'manager' | 'member';

export interface Room {
  id: string;
  name: string;
  inviteCode: string;
  inviteCodeExpiresAt?: string | null;
  ownerId: string;
  shareCode?: string | null;
  shareCodeEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomMember {
  id: string;
  role: RoomRole;
  roomId: string;
  userId: string;
  joinedAt: string;
}

export interface RoomMemberWithUser extends RoomMember {
  user: { id: string; nickname: string; profileImageUrl: string | null };
}

export type WaitTime = '없음' | '~10분' | '~30분' | '~1시간' | '1시간+';

export interface RoomRestaurant {
  id: string;
  name: string;
  address: string;
  province: string;
  city: string;
  neighborhood: string;
  category: string;
  imageUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  isClosed: boolean;
  roomId: string;
  addedById: string | null;
  createdAt: string;
  avgRating: number | null;
  wishlistCount: number;
  _count: { visits: number; reviews: number };
}

// ─── 방문 기록 ───

export interface RoomVisit {
  id: string;
  visitedAt: string;
  memo?: string | null;
  waitTime?: WaitTime | null;
  restaurantId: string;
  createdById: string | null;
  createdAt: string;
}

export interface RoomVisitParticipant {
  id: string;
  visitId: string;
  userId: string;
  user: { id: string; nickname: string; profileImageUrl: string | null };
}

export interface RoomVisitWithDetails extends RoomVisit {
  createdBy: { id: string; nickname: string } | null;
  participants: RoomVisitParticipant[];
  reviews: RoomReviewWithUser[];
  _count: { reviews: number };
}

// ─── 리뷰 ───

export interface RoomReview {
  id: string;
  rating: number;
  content: string;
  wouldRevisit: boolean;
  tasteRating?: number | null;
  valueRating?: number | null;
  serviceRating?: number | null;
  cleanlinessRating?: number | null;
  accessibilityRating?: number | null;
  favoriteMenu?: string | null;
  tryNextMenu?: string | null;
  visitId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomReviewWithUser extends RoomReview {
  user: { id: string; nickname: string; profileImageUrl: string | null };
}

// ─── 식당 상세 ───

export interface RoomRestaurantDetail extends RoomRestaurant {
  visits: RoomVisitWithDetails[];
  addedBy: { id: string; nickname: string } | null;
}

export interface RoomDetail extends Room {
  members: RoomMemberWithUser[];
  restaurants: RoomRestaurant[];
}

// ─── 공유 링크용 타입 (멤버 정보 제외) ───

export interface SharedRoomRestaurant {
  id: string;
  name: string;
  address: string;
  province: string;
  city: string;
  neighborhood: string;
  category: string;
  imageUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  reviewCount: number;
}

export interface SharedRoomVisit {
  id: string;
  visitedAt: string;
  memo?: string | null;
  reviews: SharedRoomReview[];
}

export interface SharedRoomReview {
  id: string;
  rating: number;
  content: string;
  wouldRevisit: boolean;
  tasteRating?: number | null;
  valueRating?: number | null;
  serviceRating?: number | null;
  cleanlinessRating?: number | null;
  accessibilityRating?: number | null;
  favoriteMenu?: string | null;
  tryNextMenu?: string | null;
  createdAt: string;
}

export interface SharedRoomRestaurantDetail extends SharedRoomRestaurant {
  visits: SharedRoomVisit[];
}

export interface SharedRoomDetail {
  id: string;
  name: string;
  restaurants: SharedRoomRestaurant[];
}

// ─── API 응답 타입 ───

export interface RoomListItem extends Room {
  myRole: string;
  memberCount: number;
  restaurantCount: number;
}

export interface RoomMemberInfo {
  id: string;
  role: string;
  userId: string;
  joinedAt: string;
  user: { id: string; nickname: string; profileImageUrl: string | null };
}

export interface RoomRestaurantInfo extends RoomRestaurant {
  addedBy: { id: string; nickname: string } | null;
  avgRating: number | null;
  wishlisted: boolean;
}

export interface RoomDetailResponse extends Room {
  members: RoomMemberInfo[];
  restaurants: RoomRestaurantInfo[];
}

export interface RoomRestaurantDetailResponse {
  id: string;
  name: string;
  address: string;
  province: string;
  city: string;
  neighborhood: string;
  category: string;
  imageUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  roomId: string;
  addedById: string | null;
  createdAt: string;
  addedBy: { id: string; nickname: string } | null;
  visits: RoomVisitWithDetails[];
}

export interface PaginatedRestaurants {
  data: RoomRestaurantInfo[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReviewData {
  rating: number;
  content: string;
  wouldRevisit?: boolean;
  tasteRating?: number | null;
  valueRating?: number | null;
  serviceRating?: number | null;
  cleanlinessRating?: number | null;
  accessibilityRating?: number | null;
  favoriteMenu?: string | null;
  tryNextMenu?: string | null;
}

export interface MyWishlistItem {
  id: string;
  createdAt: string;
  roomRestaurant: {
    id: string;
    name: string;
    category: string;
    address: string;
    roomId: string;
    room: { id: string; name: string };
  };
}

export interface ReviewComparison {
  user: { id: string; nickname: string };
  reviewCount: number;
  avgRating: number | null;
  latestReview: {
    rating: number;
    content: string;
    visitedAt: string;
    tasteRating: number | null;
    valueRating: number | null;
    serviceRating: number | null;
    cleanlinessRating: number | null;
    accessibilityRating: number | null;
    wouldRevisit: boolean;
  } | null;
}

export interface CompareReviewsResponse {
  restaurant: { id: string; name: string; roomId: string };
  comparisons: ReviewComparison[];
}
