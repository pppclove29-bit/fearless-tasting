export function formatRating(rating: number, max = 5): string {
  const clamped = Math.max(0, Math.min(max, rating));
  const full = Math.floor(clamped);
  const hasHalf = clamped - full >= 0.25 && clamped - full < 0.75;
  const fullRound = clamped - full >= 0.75 ? full + 1 : full;
  const empty = max - fullRound - (hasHalf ? 1 : 0);

  const starFull = '<svg style="display:inline-block;vertical-align:middle" width="14" height="14" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f59e0b" stroke="none"/></svg>';
  const starHalf = '<svg style="display:inline-block;vertical-align:middle" width="14" height="14" viewBox="0 0 24 24"><defs><linearGradient id="half"><stop offset="50%" stop-color="#f59e0b"/><stop offset="50%" stop-color="#d1d5db"/></linearGradient></defs><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#half)" stroke="none"/></svg>';
  const starEmpty = '<svg style="display:inline-block;vertical-align:middle" width="14" height="14" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#d1d5db" stroke="none"/></svg>';

  return starFull.repeat(fullRound) + (hasHalf ? starHalf : '') + starEmpty.repeat(Math.max(0, empty));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** 평균 평점 계산 (소수점 1자리 반올림). 빈 배열이면 null 반환. */
export function calcAvgRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10;
}
