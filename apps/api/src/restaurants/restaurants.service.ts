import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AreaCount {
  name: string;
  count: number;
  avgRating: number | null;
}

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 식당 목록 조회 (지역 필터 지원, 리뷰 포함) */
  async findAll(province?: string, city?: string, neighborhood?: string) {
    const restaurants = await this.prisma.read.restaurant.findMany({
      where: {
        ...(province ? { province } : {}),
        ...(city ? { city } : {}),
        ...(neighborhood ? { neighborhood } : {}),
      },
      include: {
        reviews: {
          select: { rating: true, content: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return restaurants.map((r) => {
      const ratings = r.reviews.map((rev) => rev.rating);
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null;
      return {
        ...r,
        avgRating,
        reviewCount: r.reviews.length,
        latestReview: r.reviews[0]?.content ?? null,
      };
    });
  }

  /** 식당 단건 조회 */
  async findOne(id: string) {
    const restaurant = await this.prisma.read.restaurant.findUnique({
      where: { id },
      include: { reviews: true },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with id ${id} not found`);
    }

    return restaurant;
  }

  /** 지역별 식당 수 + 평균 평점 조회 */
  async getAreaCounts(province?: string, city?: string): Promise<AreaCount[]> {
    // Raw Query 사유: Prisma groupBy는 관계 모델(Review)의 집계(AVG)를 지원하지 않음
    type RawRow = { name: string; count: bigint; avgRating: number | null };

    let rows: RawRow[];

    if (province && city) {
      rows = await this.prisma.read.$queryRaw<RawRow[]>`
        SELECT r.neighborhood AS name, COUNT(DISTINCT r.id) AS count, AVG(rev.rating) AS avgRating
        FROM Restaurant r
        LEFT JOIN Review rev ON rev.restaurantId = r.id
        WHERE r.province = ${province} AND r.city = ${city}
        GROUP BY r.neighborhood
        ORDER BY r.neighborhood ASC`;
    } else if (province) {
      rows = await this.prisma.read.$queryRaw<RawRow[]>`
        SELECT r.city AS name, COUNT(DISTINCT r.id) AS count, AVG(rev.rating) AS avgRating
        FROM Restaurant r
        LEFT JOIN Review rev ON rev.restaurantId = r.id
        WHERE r.province = ${province}
        GROUP BY r.city
        ORDER BY r.city ASC`;
    } else {
      rows = await this.prisma.read.$queryRaw<RawRow[]>`
        SELECT r.province AS name, COUNT(DISTINCT r.id) AS count, AVG(rev.rating) AS avgRating
        FROM Restaurant r
        LEFT JOIN Review rev ON rev.restaurantId = r.id
        GROUP BY r.province
        ORDER BY r.province ASC`;
    }

    return rows.map((row) => ({
      name: row.name,
      count: Number(row.count),
      avgRating: row.avgRating !== null ? Math.round(row.avgRating * 10) / 10 : null,
    }));
  }

  /** 식당 등록 */
  async create(
    name: string,
    address: string,
    province: string,
    city: string,
    neighborhood: string,
    category: string,
    imageUrl?: string,
  ) {
    return this.prisma.write.restaurant.create({
      data: { name, address, province, city, neighborhood, category, imageUrl },
    });
  }
}
