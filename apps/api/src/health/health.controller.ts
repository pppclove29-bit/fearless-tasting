import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: string; db: string; uptime: number }> {
    let db = 'ok';
    try {
      await this.prisma.read.$queryRaw`SELECT 1`;
    } catch {
      db = 'error';
    }

    return {
      status: 'ok',
      db,
      uptime: process.uptime(),
    };
  }
}
