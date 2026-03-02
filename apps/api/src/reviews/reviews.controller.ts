import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

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
  @Throttle({ default: { ttl: 60000, limit: 10 } })
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

  /** 리뷰 수정 (본인만) */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '리뷰 수정', description: '본인이 작성한 리뷰를 수정합니다.' })
  @ApiParam({ name: 'id', description: '리뷰 ID' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateReviewDto,
  ) {
    const review = await this.reviewsService.findOne(id);
    if (review.userId !== user.id) {
      throw new ForbiddenException('본인의 리뷰만 수정할 수 있습니다');
    }
    return this.reviewsService.update(id, dto.rating, dto.content);
  }

  /** 리뷰 삭제 (본인 또는 관리자) */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '리뷰 삭제', description: '본인 리뷰 또는 관리자가 리뷰를 삭제합니다.' })
  @ApiParam({ name: 'id', description: '리뷰 ID' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const review = await this.reviewsService.findOne(id);
    if (user.role !== 'admin' && review.userId !== user.id) {
      throw new ForbiddenException('본인의 리뷰만 삭제할 수 있습니다');
    }
    return this.reviewsService.remove(id);
  }
}
