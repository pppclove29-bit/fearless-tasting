export function formatRating(rating: number, max = 5): string {
  const clamped = Math.max(0, Math.min(max, Math.round(rating)));
  return '\u2605'.repeat(clamped) + '\u2606'.repeat(max - clamped);
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
