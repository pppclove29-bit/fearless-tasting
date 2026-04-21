import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// satori/resvg는 네이티브 바이너리 로드에 실패해도 앱 기동은 막지 않도록 lazy import.

@Injectable()
export class OgService {
  private readonly logger = new Logger(OgService.name);
  private fontCache: ArrayBuffer | null = null;
  private fontPromise: Promise<ArrayBuffer> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Noto Sans KR 한국어 폰트를 최초 1회만 fetch해 메모리 캐싱 */
  private async loadFont(): Promise<ArrayBuffer> {
    if (this.fontCache) return this.fontCache;
    if (this.fontPromise) return this.fontPromise;
    this.fontPromise = (async () => {
      const res = await fetch(
        'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf',
      );
      if (!res.ok) throw new Error('font fetch failed');
      const buf = await res.arrayBuffer();
      this.fontCache = buf;
      return buf;
    })();
    return this.fontPromise;
  }

  /** 공개 방 OG 이미지 PNG 바이트 생성 (1200×630) */
  async renderPublicRoomOg(roomId: string): Promise<Buffer> {
    const room = await this.prisma.read.room.findFirst({
      where: { id: roomId, isPublic: true },
      select: {
        name: true,
        restaurants: {
          select: {
            visits: { select: { reviews: { select: { rating: true } } } },
          },
        },
        _count: { select: { members: true, restaurants: true } },
      },
    });
    if (!room) throw new NotFoundException('공개 방을 찾을 수 없습니다');

    const ratings = room.restaurants.flatMap((r) =>
      r.visits.flatMap((v) => v.reviews.map((rev) => rev.rating)),
    );
    const reviewCount = ratings.length;
    const avg = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

    const font = await this.loadFont();

    // 네이티브 바이너리를 쓰므로 요청 시점에만 로드 (앱 기동 차단 방지)
    const { default: satori } = await import('satori');
    const { Resvg } = await import('@resvg/resvg-js');

    const svg = await satori(
      {
        type: 'div',
        props: {
          style: {
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '80px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            fontFamily: 'Pretendard',
          },
          children: [
            {
              type: 'div',
              props: {
                style: { display: 'flex', flexDirection: 'column', gap: '20px' },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '26px',
                        color: '#92400e',
                        fontWeight: 700,
                      },
                      children: '🍽️  무모한 시식가 · 공개 맛집 방',
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: '72px',
                        fontWeight: 900,
                        color: '#422006',
                        lineHeight: 1.2,
                        letterSpacing: '-0.02em',
                        maxHeight: '260px',
                        overflow: 'hidden',
                      },
                      children: room.name,
                    },
                  },
                ],
              },
            },
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  gap: '32px',
                  fontSize: '32px',
                  color: '#78350f',
                  fontWeight: 700,
                },
                children: [
                  { type: 'span', props: { children: `🍽️ 식당 ${room._count.restaurants}곳` } },
                  { type: 'span', props: { children: `📝 리뷰 ${reviewCount}개` } },
                  { type: 'span', props: { children: `👥 멤버 ${room._count.members}명` } },
                  ...(avg !== null
                    ? [{ type: 'span', props: { children: `★ ${avg.toFixed(1)}` } }]
                    : []),
                ],
              },
            },
          ],
        },
      },
      {
        width: 1200,
        height: 630,
        fonts: [{ name: 'Pretendard', data: font, weight: 700, style: 'normal' }],
      },
    );

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
    return Buffer.from(resvg.render().asPng());
  }
}
