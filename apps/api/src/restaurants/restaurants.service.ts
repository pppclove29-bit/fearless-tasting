import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 식당 목록 조회 */
  async findAll() {
    return this.prisma.read.restaurant.findMany({
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

  /** 식당 등록 */
  async create(
    name: string,
    address: string,
    neighborhood: string,
    latitude: number,
    longitude: number,
    category: string,
    imageUrl?: string,
  ) {
    return this.prisma.write.restaurant.create({
      data: { name, address, neighborhood, latitude, longitude, category, imageUrl },
    });
  }
}
