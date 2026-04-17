import { IsString, IsNumber, IsInt, IsOptional, Min, Max, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/** 0.5 단위로 반올림 (0.5, 1, 1.5, ..., 5) */
const roundToHalf = ({ value }: { value: unknown }) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 2) / 2 : value;
};

const VALID_RATINGS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export class CreateRoomReviewDto {
  @ApiProperty({ description: '종합 평점 (0.5~5, 0.5 단위)', minimum: 0.5, maximum: 5 })
  @Transform(roundToHalf)
  @IsNumber()
  @Min(0.5)
  @Max(5)
  @IsIn(VALID_RATINGS)
  rating!: number;

  @ApiPropertyOptional({ description: '리뷰 본문', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ApiProperty({ description: '재방문 의사 (1~5)', default: 4, required: false, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  wouldRevisit?: number;

  @ApiPropertyOptional({ description: '맛 (0.5~5, 0.5 단위)', minimum: 0.5, maximum: 5 })
  @IsOptional()
  @Transform(roundToHalf)
  @IsNumber()
  @Min(0.5)
  @Max(5)
  @IsIn(VALID_RATINGS)
  tasteRating?: number;

  @ApiPropertyOptional({ description: '가성비 (0.5~5, 0.5 단위)', minimum: 0.5, maximum: 5 })
  @IsOptional()
  @Transform(roundToHalf)
  @IsNumber()
  @Min(0.5)
  @Max(5)
  @IsIn(VALID_RATINGS)
  valueRating?: number;

  @ApiPropertyOptional({ description: '서비스/친절함 (0.5~5, 0.5 단위)', minimum: 0.5, maximum: 5 })
  @IsOptional()
  @Transform(roundToHalf)
  @IsNumber()
  @Min(0.5)
  @Max(5)
  @IsIn(VALID_RATINGS)
  serviceRating?: number;

  @ApiPropertyOptional({ description: '청결함 (0.5~5, 0.5 단위)', minimum: 0.5, maximum: 5 })
  @IsOptional()
  @Transform(roundToHalf)
  @IsNumber()
  @Min(0.5)
  @Max(5)
  @IsIn(VALID_RATINGS)
  cleanlinessRating?: number;

  @ApiPropertyOptional({ description: '접근성 (0.5~5, 0.5 단위)', minimum: 0.5, maximum: 5 })
  @IsOptional()
  @Transform(roundToHalf)
  @IsNumber()
  @Min(0.5)
  @Max(5)
  @IsIn(VALID_RATINGS)
  accessibilityRating?: number;

  @ApiPropertyOptional({ description: '또 먹고 싶은 메뉴' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  favoriteMenu?: string;

  @ApiPropertyOptional({ description: '다음에 시켜볼 메뉴' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tryNextMenu?: string;

  @ApiPropertyOptional({ description: '리뷰 이미지 URL (JSON 배열)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  images?: string;
}
