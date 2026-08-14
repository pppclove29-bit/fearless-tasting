/**
 * 기능 노출 플래그.
 *
 * 2026-08 방향 전환: "공개 맛집 플랫폼"을 접고 프라이빗 그룹 도구에 집중한다.
 * 콘텐츠가 없는 화면(공개 방 0개, 커뮤니티 게시글 없음, 랭킹 표본 부족)을
 * 신규 유저에게 그대로 보여주면 서비스 신뢰가 깎이므로 진입점만 숨긴다.
 * 페이지 자체는 살아 있다(직접 URL·검색 유입 가능) — 라우트를 지운 게 아니다.
 *
 * 되살리는 기준:
 * - SHOW_PUBLIC_ROOMS: 품질 필터를 통과한 공개 방 5개 이상
 * - SHOW_COMMUNITY:    최근 30일 게시글 20개 이상
 * - SHOW_RANKINGS:     랭킹 표본 유저 50명 이상
 */
export const SHOW_PUBLIC_ROOMS = false;
export const SHOW_COMMUNITY = false;
export const SHOW_RANKINGS = false;
