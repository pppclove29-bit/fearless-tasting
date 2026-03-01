import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly writer: PrismaClient;
  private readonly reader: PrismaClient;

  constructor() {
    this.writer = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });

    this.reader = new PrismaClient({
      datasourceUrl: process.env.DATABASE_READER_URL || process.env.DATABASE_URL,
    });
  }

  async onModuleInit() {
    await Promise.all([this.writer.$connect(), this.reader.$connect()]);
  }

  async onModuleDestroy() {
    await Promise.all([this.writer.$disconnect(), this.reader.$disconnect()]);
  }

  /** 쓰기 전용 클라이언트 (INSERT, UPDATE, DELETE) */
  get write(): PrismaClient {
    return this.writer;
  }

  /** 읽기 전용 클라이언트 (SELECT) */
  get read(): PrismaClient {
    return this.reader;
  }
}
