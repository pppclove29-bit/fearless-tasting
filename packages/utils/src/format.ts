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
