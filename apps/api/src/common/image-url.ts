/** 이미지 상대 경로에 R2_PUBLIC_URL prefix 붙이기 */
export function toImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path; // 이미 절대 URL이면 그대로
  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  return base ? `${base}/${path}` : path;
}

// 프로필 이미지는 profiles/{userId}.webp 고정 키라 URL이 안 바뀐다.
// 브라우저·CDN 캐시를 무효화하기 위해 ?v=<version>을 붙인다.
function withVersion(url: string | null, version: number | null | undefined): string | null {
  if (!url) return null;
  if (!version) return url;
  return url.includes('?') ? `${url}&v=${version}` : `${url}?v=${version}`;
}

/** user 객체의 profileImageUrl을 절대 URL + 캐시 버스터로 변환 */
export function withProfileImage<
  T extends { profileImageUrl: string | null; profileImageVersion?: number | null },
>(user: T): T {
  return {
    ...user,
    profileImageUrl: withVersion(toImageUrl(user.profileImageUrl), user.profileImageVersion),
  };
}
