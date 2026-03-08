import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomReviewDto {
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
