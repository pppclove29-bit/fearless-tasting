import { IsString, IsNumber, IsBoolean, IsOptional, IsDateString, IsArray, IsIn, Min, Max, MaxLength } from 'class-validator';

const WAIT_TIMES = ['없음', '~10분', '~30분', '~1시간', '1시간+'] as const;
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuickReviewDto {
  // ─── 방문 필드 ───

  @ApiProperty({ description: '방문 날짜 (YYYY-MM-DD)', example: '2026-03-08' })
  @IsDateString()
  visitedAt!: string;

  @ApiPropertyOptional({ description: '방문 메모' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;

  @ApiPropertyOptional({ description: '웨이팅 (없음/~10분/~30분/~1시간/1시간+)' })
  @IsOptional()
  @IsString()
  @IsIn(WAIT_TIMES)
  waitTime?: string;

  @ApiPropertyOptional({ description: '함께 간 멤버 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];

  // ─── 리뷰 필드 ───

  @ApiProperty({ description: '종합 평점 (1~5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ description: '리뷰 본문' })
  @IsString()
  content!: string;

  @ApiProperty({ description: '재방문 의사', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  wouldRevisit?: boolean;

  @ApiPropertyOptional({ description: '맛 (1~5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  tasteRating?: number;

  @ApiPropertyOptional({ description: '가성비 (1~5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  valueRating?: number;

  @ApiPropertyOptional({ description: '서비스/친절함 (1~5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  serviceRating?: number;

  @ApiPropertyOptional({ description: '청결함 (1~5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  cleanlinessRating?: number;

  @ApiPropertyOptional({ description: '접근성 (1~5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
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
}
