import type {
  Room, RoomRestaurant, RoomReview, RoomVisitWithDetails,
  SharedRoomDetail, SharedRoomRestaurantDetail,
  AuthUser, RoomListItem, RoomMemberInfo, RoomRestaurantInfo,
  RoomDetailResponse, RoomRestaurantDetailResponse, PaginatedRestaurants,
  ReviewData, ReviewComparison, CompareReviewsResponse,
  Inquiry, Notice, PollOption, Poll, TimelineItem,
  AppNotification, RoomStats, PlatformStats,
  RankingUser, RankingsResponse, DiscoverRestaurant, DiscoverResponse,
  PublicRoomListItem, PaginatedPublicRooms,
} from '@repo/types';

export type {
  AuthUser, RoomListItem, RoomMemberInfo, RoomRestaurantInfo,
  RoomDetailResponse, RoomRestaurantDetailResponse, PaginatedRestaurants,
  ReviewData, ReviewComparison, CompareReviewsResponse,
  Inquiry, Notice, PollOption, Poll, TimelineItem,
  RoomStats, PlatformStats, RankingUser, RankingsResponse,
  DiscoverRestaurant, DiscoverResponse,
  PublicRoomListItem, PaginatedPublicRooms,
};
export type { AppNotification as Notification } from '@repo/types';

export { showToast, showConfirm, showDangerConfirm } from './toast';

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

/** 응답 실패 시 서버 에러 메시지를 추출하여 throw */
async function throwIfNotOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => null);
  throw new Error(body?.message || fallback);
}

// ─── 토큰 관리 ───

const logoutState = { active: false };

/** JWT payload에서 exp(만료 시각, 초 단위)를 추출 */
function getTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch { return null; }
}

/** access token이 1분 이내 만료인지 확인 */
function isTokenExpiringSoon(): boolean {
  const token = localStorage.getItem('access_token');
  if (!token) return false;
  const exp = getTokenExp(token);
  if (!exp) return false;
  return exp - Date.now() / 1000 < 60;
}

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

  // 가능한 모든 path/domain 조합으로 쿠키 삭제 시도
  const names = ['access_token', 'refresh_token'];
  const domain = location.hostname;
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    document.cookie = `${name}=; Max-Age=0`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${domain}`;
  }
}

/** Authorization 헤더 포함 fetch 래퍼 (토큰 만료 임박 시 선제 갱신, 만료 시 자동 갱신) */
async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  // 만료 1분 전이면 선제적으로 토큰 갱신
  if (isTokenExpiringSoon() && getRefreshToken()) {
    await refreshTokens();
  }

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

  if (res.status === 401) {
    const isPublicUrl = url.includes('/shared/') || url.includes('/rooms/public') || url.includes('/auth/kakao') || url.includes('/auth/refresh');

    if (getRefreshToken()) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${getAccessToken()!}`;
        res = await fetch(url, { ...init, headers, credentials: 'omit' });
      } else {
        clearTokens();
        if (!isPublicUrl) location.href = `${API_BASE}/auth/kakao`;
        return res;
      }
    } else if (!isPublicUrl) {
      clearTokens();
      location.href = `${API_BASE}/auth/kakao`;
      return res;
    }
  }

  if (res.status >= 500) {
    showToast('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  return res;
}

/** 토큰 갱신 (내부용, 동시 호출 시 하나만 실행) */
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
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
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** 닉네임 수정 */
export async function updateNickname(nickname: string): Promise<AuthUser> {
  const res = await apiFetch(`${API_BASE}/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  await throwIfNotOk(res, '닉네임 변경에 실패했습니다.');
  return res.json();
}

/** 회원 탈퇴 */
export async function deleteAccount(): Promise<void> {
  const res = await apiFetch(`${API_BASE}/users/me`, { method: 'DELETE' });
  await throwIfNotOk(res, '탈퇴에 실패했습니다.');
}

/** 방 이름 수정 */
export async function updateRoom(id: string, name: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  await throwIfNotOk(res, '방 이름 변경에 실패했습니다.');
}

/** 현재 로그인 유저 조회 (비로그인 시 null, 같은 페이지 내 중복 호출 캐싱) */
let currentUserCache: Promise<AuthUser | null> | null = null;

const USER_CACHE_KEY = 'cached_user';

/** sessionStorage에 캐싱된 유저 정보 즉시 반환 (네트워크 없이) */
export function getCachedUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    if (!getAccessToken() && !getRefreshToken()) {
      sessionStorage.removeItem(USER_CACHE_KEY);
      return null;
    }
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function cacheUser(user: AuthUser | null) {
  try {
    if (user) {
      sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(USER_CACHE_KEY);
    }
  } catch { /* sessionStorage 사용 불가 환경 무시 */ }
}

export function fetchCurrentUser(forceRefresh = false): Promise<AuthUser | null> {
  if (!getAccessToken() && !getRefreshToken()) {
    cacheUser(null);
    return Promise.resolve(null);
  }
  if (currentUserCache && !forceRefresh) return currentUserCache;

  currentUserCache = (async () => {
    try {
      const res = await apiFetch(`${API_BASE}/auth/me`);
      if (!res.ok) {
        cacheUser(null);
        return null;
      }
      const user = await res.json() as AuthUser;
      cacheUser(user);
      return user;
    } catch {
      cacheUser(null);
      return null;
    }
  })();

  return currentUserCache;
}

/** View Transitions 페이지 전환 시 유저 캐시 초기화 */
export function resetUserCache() {
  currentUserCache = null;
}

/** 토큰 갱신 */
export async function refreshToken(): Promise<boolean> {
  return refreshTokens();
}

/** 로그아웃 — 즉시 클라이언트 토큰 삭제, 서버 DB 무효화는 fire-and-forget */
export function logout(): void {
  logoutState.active = true;
  currentUserCache = null;
  cacheUser(null);
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
    credentials: 'include',
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

  await throwIfNotOk(res, '문의 등록에 실패했습니다.');
}

/** 문의 목록 조회 (관리자 전용) */
export async function fetchInquiries(): Promise<Inquiry[]> {
  const res = await apiFetch(`${API_BASE}/inquiries`);
  if (!res.ok) return [];
  return res.json();
}

// ─── 방 관련 ───

/** 내 방 목록 */
export async function fetchMyRooms(): Promise<RoomListItem[]> {
  const res = await apiFetch(`${API_BASE}/rooms`);
  if (!res.ok) {
    console.error('[fetchMyRooms] 실패:', res.status, res.statusText);
    return [];
  }
  return res.json();
}

/** 방 상세 */
export async function fetchRoom(id: string): Promise<RoomDetailResponse> {
  const res = await apiFetch(`${API_BASE}/rooms/${id}`);
  await throwIfNotOk(res, '방 조회에 실패했습니다.');
  return res.json();
}

/** 방 생성 */
export async function createRoom(name: string, isPublic = false): Promise<Room> {
  const res = await apiFetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, isPublic }),
  });
  await throwIfNotOk(res, '방 생성에 실패했습니다.');
  return res.json();
}

/** 초대 코드로 입장 */
export async function joinRoom(inviteCode: string): Promise<Room> {
  const res = await apiFetch(`${API_BASE}/rooms/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode }),
  });
  await throwIfNotOk(res, '입장에 실패했습니다.');
  return res.json();
}

/** 방 삭제 */
export async function deleteRoom(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${id}`, { method: 'DELETE' });
  await throwIfNotOk(res, '방 삭제에 실패했습니다.');
}

/** 방 나가기 */
export async function leaveRoom(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${id}/leave`, { method: 'POST' });
  await throwIfNotOk(res, '방 나가기에 실패했습니다.');
}

/** 멤버 역할 변경 */
export async function updateRoomMemberRole(roomId: string, userId: string, role: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/members/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  await throwIfNotOk(res, '역할 변경에 실패했습니다.');
}

/** 멤버 강퇴 */
export async function kickRoomMember(roomId: string, userId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/members/${userId}`, { method: 'DELETE' });
  await throwIfNotOk(res, '강퇴에 실패했습니다.');
}

/** 방장 위임 */
export async function transferOwnership(roomId: string, userId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/transfer/${userId}`, { method: 'PATCH' });
  await throwIfNotOk(res, '방장 위임에 실패했습니다.');
}

/** 초대 코드 재생성 */
export async function regenerateInviteCode(roomId: string): Promise<{ inviteCode: string; inviteCodeExpiresAt: string }> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/invite-code`, { method: 'PATCH' });
  await throwIfNotOk(res, '초대 코드 재생성에 실패했습니다.');
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
  await throwIfNotOk(res, '식당 등록에 실패했습니다.');
  return res.json();
}

/** 방 내 식당 목록 (페이지네이션) */
export async function fetchRoomRestaurants(
  roomId: string,
  params: { page?: number; pageSize?: number; search?: string; category?: string; sort?: string } = {},
): Promise<PaginatedRestaurants> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.search) qs.set('search', params.search);
  if (params.category) qs.set('category', params.category);
  if (params.sort) qs.set('sort', params.sort);
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/restaurants?${qs}`);
  await throwIfNotOk(res, '식당 목록 조회에 실패했습니다.');
  return res.json();
}

/** 방 내 식당 상세 (리뷰 포함) */
export async function fetchRoomRestaurant(roomId: string, rid: string): Promise<RoomRestaurantDetailResponse> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/restaurants/${rid}`);
  await throwIfNotOk(res, '식당 조회에 실패했습니다.');
  return res.json();
}

/** 방 내 식당 삭제 */
export async function deleteRoomRestaurant(roomId: string, rid: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/restaurants/${rid}`, { method: 'DELETE' });
  await throwIfNotOk(res, '식당 삭제에 실패했습니다.');
}

/** 방 내 식당 수정 */
export async function updateRoomRestaurant(
  roomId: string,
  rid: string,
  data: { name?: string; category?: string; address?: string; latitude?: number; longitude?: number; isClosed?: boolean },
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/restaurants/${rid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res, '식당 수정에 실패했습니다.');
}

// ─── 방문 기록 ───

/** 방문 기록 생성 */
export async function createRoomVisit(
  roomId: string,
  rid: string,
  data: { visitedAt: string; memo?: string; waitTime?: string; participantIds?: string[] },
): Promise<RoomVisitWithDetails> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/restaurants/${rid}/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res, '방문 기록 생성에 실패했습니다.');
  return res.json();
}

/** 방문 기록 삭제 */
export async function deleteRoomVisit(roomId: string, visitId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/visits/${visitId}`, { method: 'DELETE' });
  await throwIfNotOk(res, '방문 기록 삭제에 실패했습니다.');
}

/** 방문 기록 수정 */
export async function updateRoomVisit(
  roomId: string,
  visitId: string,
  data: { visitedAt?: string; memo?: string; waitTime?: string },
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/visits/${visitId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res, '방문 기록 수정에 실패했습니다.');
}

// ─── 리뷰 ───

/** 방문 기록에 리뷰 작성 */
export async function createRoomReview(
  roomId: string,
  visitId: string,
  data: ReviewData,
): Promise<RoomReview> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/visits/${visitId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res, '리뷰 작성에 실패했습니다.');
  return res.json();
}

/** 리뷰 수정 */
export async function updateRoomReview(
  roomId: string,
  revId: string,
  data: Partial<ReviewData>,
): Promise<RoomReview> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/reviews/${revId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res, '리뷰 수정에 실패했습니다.');
  return res.json();
}

/** 리뷰 삭제 */
export async function deleteRoomReview(roomId: string, revId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/reviews/${revId}`, { method: 'DELETE' });
  await throwIfNotOk(res, '리뷰 삭제에 실패했습니다.');
}

// ─── 통계 ───

export async function fetchRoomStats(roomId: string): Promise<RoomStats> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/stats`);
  if (res.status === 204) throw new Error('통계 데이터가 없습니다.');
  await throwIfNotOk(res, '통계 조회에 실패했습니다.');
  return res.json();
}

// ─── 플랫폼 공개 통계 ───

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const res = await apiFetch(`${API_BASE}/rooms/platform-stats`);
  await throwIfNotOk(res, '통계 조회에 실패했습니다.');
  return res.json();
}

// ─── 글로벌 랭킹 ───

export async function fetchRankings(): Promise<RankingsResponse> {
  const res = await apiFetch(`${API_BASE}/users/rankings`);
  await throwIfNotOk(res, '랭킹 조회에 실패했습니다.');
  return res.json();
}


// ─── 공개 맛집 추천 ───

/** 공개 맛집 추천 리스트 (비로그인 가능) */
export async function fetchDiscover(): Promise<DiscoverResponse> {
  const res = await apiFetch(`${API_BASE}/rooms/discover`);
  await throwIfNotOk(res, '맛집 추천 조회에 실패했습니다.');
  return res.json();
}

// ─── 공유 링크 ───

/** 공유 코드로 방 조회 (비로그인) */
export async function fetchSharedRoom(shareCode: string): Promise<SharedRoomDetail> {
  const res = await apiFetch(`${API_BASE}/rooms/shared/${shareCode}`);
  await throwIfNotOk(res, '유효하지 않은 공유 링크입니다.');
  return res.json();
}

/** 공유 코드로 식당 상세 (비로그인) */
export async function fetchSharedRestaurantDetail(
  shareCode: string,
  rid: string,
): Promise<SharedRoomRestaurantDetail> {
  const res = await apiFetch(`${API_BASE}/rooms/shared/${shareCode}/restaurants/${rid}`);
  await throwIfNotOk(res, '식당 조회에 실패했습니다.');
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
  await throwIfNotOk(res, '공유 코드 관리에 실패했습니다.');
  return res.json();
}

// ─── 공지사항 ───

/** 활성 공지 목록 (공개) */
export async function fetchNotices(): Promise<Notice[]> {
  const res = await apiFetch(`${API_BASE}/notices`);
  if (!res.ok) return [];
  return res.json();
}

/** 전체 공지 목록 (관리자용, 비활성 포함) */
export async function fetchAllNotices(): Promise<Notice[]> {
  const res = await apiFetch(`${API_BASE}/notices/all`);
  if (!res.ok) return [];
  return res.json();
}

/** 공지 생성 (관리자) */
export async function createNotice(data: { title: string; content: string; enabled?: boolean }): Promise<Notice> {
  const res = await apiFetch(`${API_BASE}/notices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res, '공지 생성에 실패했습니다.');
  return res.json();
}

/** 공지 수정 (관리자) */
export async function updateNotice(id: string, data: { title?: string; content?: string; enabled?: boolean }): Promise<Notice> {
  const res = await apiFetch(`${API_BASE}/notices/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res, '공지 수정에 실패했습니다.');
  return res.json();
}

/** 공지 삭제 (관리자) */
export async function deleteNotice(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/notices/${id}`, { method: 'DELETE' });
  await throwIfNotOk(res, '공지 삭제에 실패했습니다.');
}

// ─── 투표 ───

/** 투표 생성 */
export async function createPoll(
  roomId: string,
  data: { title: string; options: { label: string; restaurantId?: string }[]; endsAt?: string },
): Promise<Poll> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/polls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res, '투표 생성에 실패했습니다.');
  return res.json();
}

/** 투표 목록 조회 */
export async function fetchPolls(roomId: string): Promise<Poll[]> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/polls`);
  if (!res.ok) return [];
  return res.json();
}

/** 투표 참여 */
export async function votePoll(roomId: string, pollId: string, optionId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/polls/${pollId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ optionId }),
  });
  await throwIfNotOk(res, '투표에 실패했습니다.');
}

/** 투표 마감 */
export async function closePoll(roomId: string, pollId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/polls/${pollId}/close`, { method: 'PATCH' });
  await throwIfNotOk(res, '투표 마감에 실패했습니다.');
}

// ─── 타임라인 ───

/** 방 활동 타임라인 */
export async function fetchTimeline(roomId: string): Promise<TimelineItem[]> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/timeline`);
  if (!res.ok) return [];
  return res.json();
}

// ─── 알림 ───

/** 내 알림 목록 */
export async function fetchMyNotifications(): Promise<AppNotification[]> {
  const res = await apiFetch(`${API_BASE}/users/me/notifications`);
  if (!res.ok) return [];
  return res.json();
}

/** 안 읽은 알림 수 */
export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await apiFetch(`${API_BASE}/users/me/notifications/unread-count`);
  if (!res.ok) return 0;
  const data = await res.json();
  return typeof data.count === 'number' ? data.count : 0;
}

/** 알림 모두 읽음 처리 */
export async function markNotificationsRead(): Promise<void> {
  await apiFetch(`${API_BASE}/users/me/notifications/read`, { method: 'PATCH' });
}

// ─── 공개 방 ───

/** 공개 방 목록 (비로그인 가능) */
export async function fetchPublicRooms(page = 1, pageSize = 12): Promise<PaginatedPublicRooms> {
  const res = await apiFetch(`${API_BASE}/rooms/public?page=${page}&pageSize=${pageSize}`);
  await throwIfNotOk(res, '공개 방 목록을 불러올 수 없습니다.');
  return res.json();
}

/** 공개 방 상세 (비로그인 가능) */
export async function fetchPublicRoomDetail(roomId: string): Promise<SharedRoomDetail> {
  const res = await apiFetch(`${API_BASE}/rooms/public/${roomId}`);
  await throwIfNotOk(res, '공개 방을 찾을 수 없습니다.');
  return res.json();
}

/** 공개 방 식당 상세 (비로그인 가능) */
export async function fetchPublicRoomRestaurantDetail(roomId: string, rid: string): Promise<SharedRoomRestaurantDetail> {
  const res = await apiFetch(`${API_BASE}/rooms/public/${roomId}/restaurants/${rid}`);
  await throwIfNotOk(res, '식당 조회에 실패했습니다.');
  return res.json();
}

/** 공개 방 설정 토글 (방장만) */
export async function toggleRoomPublic(roomId: string, isPublic: boolean): Promise<{ isPublic: boolean }> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/public`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isPublic }),
  });
  await throwIfNotOk(res, '공개 설정 변경에 실패했습니다.');
  return res.json();
}

// ─── 리뷰 비교 ───

/** 식당별 멤버 리뷰 비교 */
export async function fetchReviewComparison(roomId: string, restaurantId: string): Promise<CompareReviewsResponse> {
  const res = await apiFetch(`${API_BASE}/rooms/${roomId}/restaurants/${restaurantId}/compare`);
  await throwIfNotOk(res, '리뷰 비교 조회에 실패했습니다.');
  return res.json();
}

