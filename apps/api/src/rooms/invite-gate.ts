/**
 * 초대 필수(강제 초대) 정책.
 *
 * 혼자 쓰는 유저의 평균 수명은 2.5일, 다른 멤버와 함께 쓰는 유저는 23.1일이었다 (2026-11 운영 데이터).
 * 그래서 이 시점 이후 만든 방은 멤버가 2명 이상이 되기 전까지 기록(식당·방문·리뷰·투표)을 추가할 수 없다.
 * 이전에 만든 방은 기존 1인 사용자를 갑자기 막지 않도록 적용하지 않는다.
 */
export const INVITE_REQUIRED_SINCE = new Date('2026-11-09T06:00:00Z');

/** 기록을 시작하는 데 필요한 최소 멤버 수 */
export const MIN_MEMBERS_TO_RECORD = 2;

/**
 * 이미 식당이 하나라도 있는 방은 다시 잠그지 않는다.
 * (함께 쓰다 상대가 나가거나 강퇴돼 1명이 돼도, 남은 사람이 쌓인 기록을 계속 보고 쓸 수 있어야 한다)
 */
export function isInviteRequired(
  roomCreatedAt: Date,
  memberCount: number,
  restaurantCount: number,
): boolean {
  return (
    roomCreatedAt >= INVITE_REQUIRED_SINCE &&
    memberCount < MIN_MEMBERS_TO_RECORD &&
    restaurantCount === 0
  );
}
