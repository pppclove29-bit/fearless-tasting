import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoomReviewDto {
  @ApiPropertyOptional({ description: '종합 평점 (1~5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: '리뷰 본문' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '재방문 의사' })
  @IsOptional()
  @IsBoolean()
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

  @ApiPropertyOptional({ description: '다시 먹어볼 메뉴' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  favoriteMenu?: string;

  @ApiPropertyOptional({ description: '다음에 먹어볼 메뉴' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tryNextMenu?: string;
}
