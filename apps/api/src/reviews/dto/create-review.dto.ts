import { IsString, IsNumber, IsArray, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: '리뷰 대상 식당 ID' })
  @IsString()
  restaurantId!: string;

  @ApiProperty({ description: '평점 (1~5)', minimum: 1, maximum: 5, example: 4 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ description: '리뷰 본문', example: '맛있어요!' })
  @IsString()
  content!: string;

  @ApiProperty({ description: '리뷰 이미지 URL 배열', example: [] })
  @IsArray()
  @IsString({ each: true })
  imageUrls!: string[];
}
