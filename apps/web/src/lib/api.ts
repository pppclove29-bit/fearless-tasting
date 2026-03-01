import type { Restaurant, Review } from '@repo/types';

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

export interface AreaCount {
  name: string;
  count: number;
}

/** 지역별 식당 수 조회 */
export async function fetchAreaCounts(
  province?: string,
  city?: string,
): Promise<AreaCount[]> {
  const params = new URLSearchParams();
  if (province) params.set('province', province);
  if (city) params.set('city', city);

  const res = await fetch(`${API_BASE}/restaurants/areas/counts?${params.toString()}`);
  if (!res.ok) return [];
  return res.json();
}

/** 식당 목록 조회 (지역 필터) */
export async function fetchRestaurants(
  province: string,
  city: string,
  neighborhood: string,
): Promise<Restaurant[]> {
  const params = new URLSearchParams({ province, city, neighborhood });
  const res = await fetch(`${API_BASE}/restaurants?${params.toString()}`);
  if (!res.ok) return [];
  return res.json();
}

interface User {
  id: string;
  nickname: string;
}

/** 닉네임으로 사용자 조회 또는 생성 */
export async function findOrCreateUser(nickname: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });

  if (!res.ok) {
    throw new Error('사용자 처리에 실패했습니다.');
  }

  return res.json();
}

/** 리뷰 작성 */
export async function createReview(
  restaurantId: string,
  userId: string,
  rating: number,
  content: string,
): Promise<Review> {
  const res = await fetch(`${API_BASE}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurantId, userId, rating, content, imageUrls: [] }),
  });

  if (!res.ok) {
    throw new Error('리뷰 등록에 실패했습니다.');
  }

  return res.json();
}

export type CreateRestaurantInput = Omit<Restaurant, 'id' | 'createdAt' | 'updatedAt'>;

/** 식당 등록 */
export async function createRestaurant(data: CreateRestaurantInput): Promise<Restaurant> {
  const res = await fetch(`${API_BASE}/restaurants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: '식당 등록에 실패했습니다.' }));
    throw new Error(error.message || '식당 등록에 실패했습니다.');
  }

  return res.json();
}
