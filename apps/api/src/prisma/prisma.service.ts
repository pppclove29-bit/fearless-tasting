import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { Prisma} from '@prisma/client';
import { PrismaClient } from '@prisma/client';

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
    // connection_limit: 풀 크기 축소 (TiDB 무료 티어 부하 방지)
    // pool_timeout: 커넥션 풀 대기 타임아웃 30초 (콜드스타트 대응)
    const writerUrl = this.appendPoolParams(process.env.DATABASE_URL || '');
    const readerUrl = this.appendPoolParams(process.env.DATABASE_READER_URL || process.env.DATABASE_URL || '');

    this.writer = new PrismaClient({
      datasourceUrl: writerUrl,
      log: [{ emit: 'event', level: 'query' }],
    });

    this.reader = new PrismaClient({
      datasourceUrl: readerUrl,
      log: [{ emit: 'event', level: 'query' }],
    });
  }

  private appendPoolParams(url: string): string {
    if (!url) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}connection_limit=5&pool_timeout=30`;
  }

  async onModuleInit() {
    // 재시도 로직: 콜드스타트 시 DB 연결 실패 대응
    await this.connectWithRetry();

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

  private async connectWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await Promise.all([this.writer.$connect(), this.reader.$connect()]);
        this.logger.log(`DB 연결 성공 (시도 ${attempt}/${maxRetries})`);
        return;
      } catch (err) {
        this.logger.error(`DB 연결 실패 (시도 ${attempt}/${maxRetries}): ${err instanceof Error ? err.message : err}`);
        if (attempt === maxRetries) throw err;
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
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
