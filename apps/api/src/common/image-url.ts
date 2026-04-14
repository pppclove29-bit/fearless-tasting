/** 이미지 상대 경로에 R2_PUBLIC_URL prefix 붙이기 */
export function toImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path; // 이미 절대 URL이면 그대로
  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  return base ? `${base}/${path}` : path;
}

/** user 객체의 profileImageUrl을 절대 URL로 변환 */
export function withProfileImage<T extends { profileImageUrl: string | null }>(
  user: T,
): T {
  return { ...user, profileImageUrl: toImageUrl(user.profileImageUrl) };
}
