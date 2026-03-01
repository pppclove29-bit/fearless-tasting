import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** 리뷰 목록 조회 */
  @Get()
  findAll() {
    return this.reviewsService.findAll();
  }

  /** 특정 식당의 리뷰 조회 */
  @Get('restaurant/:restaurantId')
  findByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.reviewsService.findByRestaurant(restaurantId);
  }

  /** 리뷰 작성 */
  @Post()
  create(@Body() dto: CreateReviewDto) {
    return this.reviewsService.create(
      dto.restaurantId,
      dto.userId,
      dto.rating,
      dto.content,
      dto.imageUrls,
    );
  }
}
