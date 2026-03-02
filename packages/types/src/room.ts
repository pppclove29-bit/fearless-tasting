export type RoomRole = 'owner' | 'manager' | 'member';

export interface Room {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
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

export interface RoomRestaurant {
  id: string;
  name: string;
  address: string;
  province: string;
  city: string;
  neighborhood: string;
  category: string;
  imageUrl?: string;
  roomId: string;
  addedById: string;
  createdAt: string;
}

export interface RoomReview {
  id: string;
  rating: number;
  content: string;
  roomRestaurantId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomReviewWithUser extends RoomReview {
  user: { id: string; nickname: string; profileImageUrl: string | null };
}

export interface RoomRestaurantDetail extends RoomRestaurant {
  reviews: RoomReviewWithUser[];
  addedBy: { id: string; nickname: string };
}

export interface RoomDetail extends Room {
  members: RoomMemberWithUser[];
  restaurants: RoomRestaurant[];
}
