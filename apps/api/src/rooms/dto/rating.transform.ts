/** 허용 평점 값 (0.5 단위) */
export const VALID_RATINGS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

/**
 * 0.5 단위로 반올림 (0.5, 1, 1.5, ..., 5).
 * null/undefined/빈 문자열은 그대로 통과시켜 @IsOptional()이 "미입력"으로 처리하게 한다.
 * (Number(null) === 0 이라 변환하면 @Min(0.5)에 걸려 미입력 세부 평점이 400을 낸다)
 */
export const roundToHalf = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') return value;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 2) / 2 : value;
};
