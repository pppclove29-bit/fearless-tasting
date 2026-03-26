import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

type PrismaClientWithEvents = PrismaClient<
  Prisma.PrismaClientOptions,
  'query'
>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly writer: PrismaClientWithEvents;
  private readonly reader: PrismaClientWithEvents;
  private readonly logger = new Logger('Prisma');

  constructor() {
    this.writer = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
      log: [{ emit: 'event', level: 'query' }],
    });

    this.reader = new PrismaClient({
      datasourceUrl: process.env.DATABASE_READER_URL || process.env.DATABASE_URL,
      log: [{ emit: 'event', level: 'query' }],
    });
  }

  async onModuleInit() {
    await Promise.all([this.writer.$connect(), this.reader.$connect()]);

    const SLOW_QUERY_MS = 200;

    this.writer.$on('query', (e: Prisma.QueryEvent) => {
      if (e.duration >= SLOW_QUERY_MS) {
        this.logger.warn(
          `[SLOW WRITER] ${e.duration}ms | ${e.query} | params: ${e.params}`,
        );
      } else {
        this.logger.debug(`[WRITER] ${e.duration}ms | ${e.query}`);
      }
    });

    this.reader.$on('query', (e: Prisma.QueryEvent) => {
      if (e.duration >= SLOW_QUERY_MS) {
        this.logger.warn(
          `[SLOW READER] ${e.duration}ms | ${e.query} | params: ${e.params}`,
        );
      } else {
        this.logger.debug(`[READER] ${e.duration}ms | ${e.query}`);
      }
    });
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
