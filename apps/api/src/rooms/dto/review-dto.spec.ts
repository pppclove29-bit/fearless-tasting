import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateRoomReviewDto } from './create-room-review.dto';
import { UpdateRoomReviewDto } from './update-room-review.dto';

/** 전역 ValidationPipe({ whitelist: true, transform: true })와 같은 순서로 변환 → 검증 */
function validate<T extends object>(
  cls: new () => T,
  body: Record<string, number | string | null>,
) {
  const instance = plainToInstance(cls, body);
  const errors = validateSync(instance, { whitelist: true });
  return { instance, errors };
}

const DETAIL_FIELDS = [
  'tasteRating',
  'valueRating',
  'serviceRating',
  'cleanlinessRating',
  'accessibilityRating',
] as const;

describe('CreateRoomReviewDto', () => {
  it('미입력 세부 평점을 null로 보내도 통과한다 (식당 등록 위저드)', () => {
    const body = Object.fromEntries(DETAIL_FIELDS.map((f) => [f, null]));
    const { instance, errors } = validate(CreateRoomReviewDto, { rating: 4, ...body });

    expect(errors).toHaveLength(0);
    for (const f of DETAIL_FIELDS) expect(instance[f]).toBeNull();
  });

  it('세부 평점을 생략해도 통과한다', () => {
    const { errors } = validate(CreateRoomReviewDto, { rating: 4 });
    expect(errors).toHaveLength(0);
  });

  it('평점은 0.5 단위로 반올림한다', () => {
    const { instance, errors } = validate(CreateRoomReviewDto, { rating: 3.7, tasteRating: 4.2 });
    expect(errors).toHaveLength(0);
    expect(instance.rating).toBe(3.5);
    expect(instance.tasteRating).toBe(4);
  });

  it('종합 평점 누락/null은 거부한다', () => {
    expect(validate(CreateRoomReviewDto, {}).errors.map((e) => e.property)).toContain('rating');
    expect(validate(CreateRoomReviewDto, { rating: null }).errors.map((e) => e.property)).toContain(
      'rating',
    );
  });

  it('범위 밖 평점은 거부한다', () => {
    expect(validate(CreateRoomReviewDto, { rating: 0 }).errors.map((e) => e.property)).toContain(
      'rating',
    );
    expect(
      validate(CreateRoomReviewDto, { rating: 4, tasteRating: 0 }).errors.map((e) => e.property),
    ).toContain('tasteRating');
    expect(validate(CreateRoomReviewDto, { rating: 6 }).errors.map((e) => e.property)).toContain(
      'rating',
    );
  });
});

describe('UpdateRoomReviewDto', () => {
  it('세부 평점을 null로 보내 지울 수 있다 (리뷰 수정 폼)', () => {
    const { instance, errors } = validate(UpdateRoomReviewDto, {
      tasteRating: null,
      valueRating: 3,
    });
    expect(errors).toHaveLength(0);
    expect(instance.tasteRating).toBeNull();
    expect(instance.valueRating).toBe(3);
  });
});
