import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** 사용자 목록 조회 */
  async findAll() {
    return this.prisma.read.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 사용자 단건 조회 */
  async findOne(id: string) {
    const user = await this.prisma.read.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

}
