import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 리뷰 목록 조회 */
  async findAll() {
    return this.prisma.read.review.findMany({
      include: { restaurant: true, user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 특정 식당의 리뷰 조회 */
  async findByRestaurant(restaurantId: string) {
    return this.prisma.read.review.findMany({
      where: { restaurantId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 리뷰 작성 */
  async create(
    restaurantId: string,
    userId: string,
    rating: number,
    content: string,
    imageUrls: string[],
  ) {
    const restaurant = await this.prisma.read.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with id ${restaurantId} not found`);
    }

    return this.prisma.write.review.create({
      data: { restaurantId, userId, rating, content, imageUrls },
    });
  }
}
