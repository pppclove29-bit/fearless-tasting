import { Injectable, Logger } from '@nestjs/common';

export interface PlaceResult {
  source: 'naver';
  name: string;
  address: string;
  roadAddress: string;
  category: string;
  telephone: string;
  /** KATEC TM128 X 좌표 (원본). 프론트에서 주소 기반 지오코딩으로 WGS84 lat/lng 변환 필요 */
  mapx: string;
  /** KATEC TM128 Y 좌표 (원본) */
  mapy: string;
}

function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  /** 네이버 로컬 장소 검색 (페이지당 5개 — Naver Open API 제약). start는 1..1000 */
  async searchNaver(query: string, start: number = 1): Promise<{ items: PlaceResult[]; reason: string; start: number; hasMore: boolean }> {
    // 검색 전용 앱을 따로 쓰는 경우 NAVER_SEARCH_* 로 override 가능
    const clientId = process.env.NAVER_SEARCH_CLIENT_ID || process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET || process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      this.logger.warn('NAVER_CLIENT_ID/SECRET 환경변수 미설정 — 네이버 검색 비활성');
      return { items: [], reason: 'missing_credentials', start, hasMore: false };
    }
    if (!query || query.trim().length < 2) return { items: [], reason: 'query_too_short', start, hasMore: false };
    const safeStart = Math.min(Math.max(1, Math.floor(start)), 1000);

    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&start=${safeStart}&sort=random`;
    try {
      const res = await fetch(url, {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn(`Naver API 오류 status=${res.status} body=${body.slice(0, 300)}`);
        return { items: [], reason: `naver_error_${res.status}`, start: safeStart, hasMore: false };
      }
      const data = await res.json() as {
        total?: number;
        items?: Array<{
          title: string;
          category: string;
          telephone: string;
          address: string;
          roadAddress: string;
          mapx: string;
          mapy: string;
        }>;
      };
      if (!data.items || data.items.length === 0) {
        this.logger.log(`Naver 검색 결과 0 (query="${query}" start=${safeStart} total=${data.total ?? 0})`);
        return { items: [], reason: `zero_results_total_${data.total ?? 0}`, start: safeStart, hasMore: false };
      }
      const items = data.items.map((item) => ({
        source: 'naver' as const,
        name: stripHtmlTags(item.title),
        address: item.address,
        roadAddress: item.roadAddress,
        category: item.category,
        telephone: item.telephone,
        mapx: item.mapx,
        mapy: item.mapy,
      }));
      const total = data.total ?? 0;
      const hasMore = safeStart + items.length <= Math.min(total, 1000) && items.length === 5;
      return { items, reason: 'ok', start: safeStart, hasMore };
    } catch (err) {
      this.logger.error('Naver 검색 예외', err);
      return { items: [], reason: 'exception', start: safeStart, hasMore: false };
    }
  }
}
