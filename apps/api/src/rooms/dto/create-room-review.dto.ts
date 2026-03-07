import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomReviewDto {
  @ApiProperty({ description: '평점 (1~5)', minimum: 1, maximum: 5 })
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
}
