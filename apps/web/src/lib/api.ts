import type {
  Room, RoomRestaurant, RoomReview,
  SharedRoomDetail, SharedRoomRestaurantDetail,
} from '@repo/types';

export { showToast, showConfirm, showDangerConfirm } from './toast';

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

// ─── 토큰 관리 ───

const logoutState = { active: false };

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

export function saveTokens(accessToken: string, refreshToken: string) {
  if (logoutState.active) return;
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  document.cookie = 'access_token=; Max-Age=0; path=/';
  document.cookie = 'refresh_token=; Max-Age=0; path=/';
}

/** Authorization 헤더 포함 fetch 래퍼 (토큰 만료 시 자동 갱신) */
async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, credentials: 'omit' });
  } catch {
    showToast('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
    throw new Error('네트워크 오류');
  }

  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()!}`;
      res = await fetch(url, { ...init, headers, credentials: 'omit' });
    }
  }

  if (res.status >= 500) {
    showToast('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  return res;
}

/** 토큰 갱신 (내부용) */
async function refreshTokens(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ refreshToken: getRefreshToken() }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = await res.json();
    saveTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  role: string;
  profileImageUrl: string | null;
}

/** 닉네임 수정 */
export async function updateNickname(nickname: string): Promise<AuthUser> {
  const res = await apiFetch(`${API_BASE}/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: '닉네임 변경에 실패했습니다.' }));
    throw new Error(error.message || '닉네임 변경에 실패했습니다.');
  }
  return res.json();
}

/** 방 이름 수정 */
export async function updateRoom(id: string, name: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('방 이름 변경에 실패했습니다.');
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
  return refreshTokens();
}

/** 로그아웃 — 즉시 클라이언트 토큰 삭제, 서버 DB 무효화는 fire-and-forget */
export function logout(): void {
  logoutState.active = true;
  const accessToken = getAccessToken();
  const rt = getRefreshToken();
  clearTokens();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers,
    credentials: 'omit',
    body: JSON.stringify({ refreshToken: rt }),
  }).catch(() => {});
}

/** 문의 등록 */
export async function createInquiry(data: {
  category: string;
  email: string;
  subject: string;
  content: string;
}): Promise<void> {
  const res = await apiFetch(`${API_BASE}/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error('문의 등록에 실패했습니다.');
  }
}

export interface Inquiry {
  id: string;
  category: string;
  email: string;
  subject: string;
  content: string;
  createdAt: string;
}

/** 문의 목록 조회 (관리자 전용) */
export async function fetchInquiries(): Promise<Inquiry[]> {
  const res = await apiFetch(`${API_BASE}/inquiries`);
  if (!res.ok) return [];
  return res.json();
}

// ─── 방 관련 ───

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
  addedBy: { id: string; nickname: string };
  _count: { reviews: number };
  avgRating: number | null;
}

export interface RoomDetailResponse extends Room {
  members: RoomMemberInfo[];
  restaurants: RoomRestaurantInfo[];
}

export interface RoomReviewWithUser extends RoomReview {
  user: { id: string; nickname: string; profileImageUrl: string | null };
}

export interface RoomRestaurantDetailResponse extends RoomRestaurant {
  addedBy: { id: string; nickname: string };
  reviews: RoomReviewWithUser[];
}

/** 내 방 목록 */
export async function fetchMyRooms(): Promise<RoomListItem[]> {
  const res = await apiFetch(`${API_BASE}/rooms`);
  if (!res.ok) return [];
  return res.json();
}

/** 방 상세 */
export async function fetchRoom(id: string): Promise<RoomDetailResponse> {
  const res = await apiFetch(`${API_BASE}/rooms/${id}`);
  if (!res.ok) throw new Error('방 조회에 실패했습니다.');
  return res.json();
}

/** 방 생성 */
export async function createRoom(name: string): Promise<Room> {
  const res = await apiFetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('방 생성에 실패했습니다.');
  return res.json();
}

/** 초대 코드로 입장 */
export async function joinRoom(inviteCode: string): Promise<Room> {
  const res = await apiFetch(`${API_BASE}/rooms/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: '입장에 실패했습니다.' }));
    throw new Error(error.message || '입장에 실패했습니다.');
  }
  return res.json();
}

/** 방 삭제 */
export async function deleteRoom(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('방 삭제에 실패했습니다.');
}

/** 방 나가기 */
export async function leaveRoom(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${id}/leave`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: '방 나가기에 실패했습니다.' }));
    throw new Error(error.message || '방 나가기에 실패했습니다.');
  }
}

/** 멤버 역할 변경 */
export async function updateRoomMemberRole(roomId: string, userId: string, role: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/members/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error('역할 변경에 실패했습니다.');
}

/** 멤버 강퇴 */
export async function kickRoomMember(roomId: string, userId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/members/${userId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('강퇴에 실패했습니다.');
}

/** 방장 위임 */
export async function transferOwnership(roomId: string, userId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/transfer/${userId}`, { method: 'PATCH' });
  if (!res.ok) throw new Error('방장 위임에 실패했습니다.');
}

/** 초대 코드 재생성 */
export async function regenerateInviteCode(roomId: string): Promise<{ inviteCode: string; inviteCodeExpiresAt: string }> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/invite-code`, { method: 'PATCH' });
  if (!res.ok) throw new Error('초대 코드 재생성에 실패했습니다.');
  return res.json();
}

/** 방 내 식당 등록 */
export async function createRoomRestaurant(
  roomId: string,
  data: Omit<RoomRestaurant, 'id' | 'roomId' | 'addedById' | 'createdAt'>,
): Promise<RoomRestaurant> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/restaurants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('식당 등록에 실패했습니다.');
  return res.json();
}

/** 방 내 식당 상세 (리뷰 포함) */
export async function fetchRoomRestaurant(roomId: string, rid: string): Promise<RoomRestaurantDetailResponse> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/restaurants/${rid}`);
  if (!res.ok) throw new Error('식당 조회에 실패했습니다.');
  return res.json();
}

/** 방 내 식당 삭제 */
export async function deleteRoomRestaurant(roomId: string, rid: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/restaurants/${rid}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('식당 삭제에 실패했습니다.');
}

/** 방 내 리뷰 작성 */
export async function createRoomReview(
  roomId: string,
  rid: string,
  data: { rating: number; content: string; wouldRevisit?: boolean },
): Promise<RoomReview> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/restaurants/${rid}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('리뷰 작성에 실패했습니다.');
  return res.json();
}

/** 방 내 리뷰 수정 */
export async function updateRoomReview(
  roomId: string,
  revId: string,
  data: { rating?: number; content?: string; wouldRevisit?: boolean },
): Promise<RoomReview> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/reviews/${revId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('리뷰 수정에 실패했습니다.');
  return res.json();
}

/** 방 내 리뷰 삭제 */
export async function deleteRoomReview(roomId: string, revId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/reviews/${revId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('리뷰 삭제에 실패했습니다.');
}

// ─── 공유 링크 ───

/** 공유 코드로 방 조회 (비로그인) */
export async function fetchSharedRoom(shareCode: string): Promise<SharedRoomDetail> {
  const res = await apiFetch(`${API_BASE}/rooms/shared/${shareCode}`);
  if (!res.ok) throw new Error('유효하지 않은 공유 링크입니다.');
  return res.json();
}

/** 공유 코드로 식당 상세 (비로그인) */
export async function fetchSharedRestaurantDetail(
  shareCode: string,
  rid: string,
): Promise<SharedRoomRestaurantDetail> {
  const res = await apiFetch(`${API_BASE}/rooms/shared/${shareCode}/restaurants/${rid}`);
  if (!res.ok) throw new Error('식당 조회에 실패했습니다.');
  return res.json();
}

/** 공유 코드 관리 */
export async function toggleShareCode(
  roomId: string,
  action: 'enable' | 'disable' | 'regenerate',
): Promise<{ shareCode: string | null; shareCodeEnabled: boolean }> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/share-code`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error('공유 코드 관리에 실패했습니다.');
  return res.json();
}

