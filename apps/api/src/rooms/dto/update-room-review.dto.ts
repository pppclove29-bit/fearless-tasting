import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoomReviewDto {
  @ApiPropertyOptional({ description: '평점 (1~5)', minimum: 1, maximum: 5 })
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
}
