/**
 * 초대 유도(소프트 게이트) 정책.
 *
 * 혼자 쓰는 유저의 평균 수명은 2.5일, 다른 멤버와 함께 쓰는 유저는 23.1일이었다 (2026-11 운영 데이터).
 * 처음에는 새 방을 2명이 되기 전까지 완전히 잠갔지만(2026-11-09), 그러면 방이 늘 비어 있어
 * 초대 미리보기가 "식당 0곳"으로 나가고 혼자 온 사람은 가치를 느끼기 전에 벽부터 만났다.
 * 그래서 혼자서도 식당 SOLO_RESTAURANT_LIMIT곳까지는 기록하게 하고, 그 이후 추가부터 초대를 요구한다.
 * 이미 쌓인 기록을 보는 것은 언제나 가능하다 — 막는 것은 "추가"뿐이다.
 * 이 시점 이전에 만든 방은 기존 1인 사용자를 갑자기 막지 않도록 적용하지 않는다.
 */
export const INVITE_REQUIRED_SINCE = new Date('2026-11-09T06:00:00Z');

/** 혼자인 방에서 초대 없이 기록할 수 있는 식당 수 (위시리스트 포함) */
export const SOLO_RESTAURANT_LIMIT = 3;

/** 함께 쓴다고 보는 최소 멤버 수 */
export const MIN_MEMBERS_TO_RECORD = 2;

/**
 * 혼자서 더 추가할 수 있는 식당 수. 게이트 대상이 아니면(이전에 만든 방, 2명 이상) null.
 * 0이면 초대가 필요하다.
 */
export function soloRestaurantsLeft(
  roomCreatedAt: Date,
  memberCount: number,
  restaurantCount: number,
): number | null {
  if (roomCreatedAt < INVITE_REQUIRED_SINCE || memberCount >= MIN_MEMBERS_TO_RECORD) return null;
  return Math.max(0, SOLO_RESTAURANT_LIMIT - restaurantCount);
}

/** 새 기록 추가에 초대가 필요한 상태인지 */
export function isInviteRequired(
  roomCreatedAt: Date,
  memberCount: number,
  restaurantCount: number,
): boolean {
  return soloRestaurantsLeft(roomCreatedAt, memberCount, restaurantCount) === 0;
}
