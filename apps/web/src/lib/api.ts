import type { Restaurant, Review } from '@repo/types';

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

/** credentials: 'include' 기본 포함 fetch 래퍼 */
function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { credentials: 'include', ...init });
}

export interface AreaCount {
  name: string;
  count: number;
  avgRating: number | null;
}

/** 지역별 식당 수 조회 */
export async function fetchAreaCounts(
  province?: string,
  city?: string,
): Promise<AreaCount[]> {
  const params = new URLSearchParams();
  if (province) params.set('province', province);
  if (city) params.set('city', city);

  const res = await apiFetch(`${API_BASE}/restaurants/areas/counts?${params.toString()}`);
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
  const res = await apiFetch(`${API_BASE}/restaurants?${params.toString()}`);
  if (!res.ok) return [];
  return res.json();
}

interface AuthUser {
  id: string;
  email: string;
}

/** 현재 로그인 유저 조회 (비로그인 시 null) */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await apiFetch(`${API_BASE}/auth/me`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** 토큰 갱신 */
export async function refreshToken(): Promise<boolean> {
  try {
    const res = await apiFetch(`${API_BASE}/auth/refresh`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

/** 로그아웃 */
export async function logout(): Promise<void> {
  await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
}

/** 리뷰 작성 */
export async function createReview(
  restaurantId: string,
  rating: number,
  content: string,
): Promise<Review> {
  const res = await apiFetch(`${API_BASE}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurantId, rating, content, imageUrls: [] }),
  });

  if (!res.ok) {
    throw new Error('리뷰 등록에 실패했습니다.');
  }

  return res.json();
}

export type CreateRestaurantInput = Omit<Restaurant, 'id' | 'createdAt' | 'updatedAt'>;

/** 식당 등록 */
export async function createRestaurant(data: CreateRestaurantInput): Promise<Restaurant> {
  const res = await apiFetch(`${API_BASE}/restaurants`, {
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
