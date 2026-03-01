import { IsString, IsNumber, IsArray, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  restaurantId: string;

  @IsString()
  userId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  content: string;

  @IsArray()
  @IsString({ each: true })
  imageUrls: string[];
}
