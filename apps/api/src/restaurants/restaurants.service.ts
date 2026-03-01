import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AreaCount {
  name: string;
  count: number;
}

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 식당 목록 조회 (지역 필터 지원) */
  async findAll(province?: string, city?: string, neighborhood?: string) {
    return this.prisma.read.restaurant.findMany({
      where: {
        ...(province ? { province } : {}),
        ...(city ? { city } : {}),
        ...(neighborhood ? { neighborhood } : {}),
      },
      orderBy: { createdAt: 'desc' },
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

  /** 지역별 식당 수 조회 */
  async getAreaCounts(province?: string, city?: string): Promise<AreaCount[]> {
    if (province && city) {
      const results = await this.prisma.read.restaurant.groupBy({
        by: ['neighborhood'],
        where: { province, city },
        _count: { id: true },
        orderBy: { neighborhood: 'asc' },
      });
      return results.map((r) => ({ name: r.neighborhood, count: r._count.id }));
    }

    if (province) {
      const results = await this.prisma.read.restaurant.groupBy({
        by: ['city'],
        where: { province },
        _count: { id: true },
        orderBy: { city: 'asc' },
      });
      return results.map((r) => ({ name: r.city, count: r._count.id }));
    }

    const results = await this.prisma.read.restaurant.groupBy({
      by: ['province'],
      _count: { id: true },
      orderBy: { province: 'asc' },
    });
    return results.map((r) => ({ name: r.province, count: r._count.id }));
  }

  /** 식당 등록 */
  async create(
    name: string,
    address: string,
    province: string,
    city: string,
    neighborhood: string,
    latitude: number,
    longitude: number,
    category: string,
    imageUrl?: string,
  ) {
    return this.prisma.write.restaurant.create({
      data: { name, address, province, city, neighborhood, latitude, longitude, category, imageUrl },
    });
  }
}
