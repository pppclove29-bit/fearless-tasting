import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('리뷰')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** 리뷰 목록 조회 */
  @Get()
  @ApiOperation({ summary: '전체 리뷰 조회' })
  findAll() {
    return this.reviewsService.findAll();
  }

  /** 특정 식당의 리뷰 조회 */
  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: '식당별 리뷰 조회', description: '특정 식당에 달린 리뷰를 조회합니다.' })
  @ApiParam({ name: 'restaurantId', description: '식당 ID' })
  findByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.reviewsService.findByRestaurant(restaurantId);
  }

  /** 리뷰 작성 (로그인 필수) */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '리뷰 작성', description: '식당에 리뷰를 작성합니다. 로그인 필수.' })
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(
      dto.restaurantId,
      user.id,
      dto.rating,
      dto.content,
      dto.imageUrls,
    );
  }
}
