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

  /** 네이버 로컬 장소 검색 (최대 5개 — Naver Open API 제약) */
  async searchNaver(query: string): Promise<{ items: PlaceResult[]; reason: string }> {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      this.logger.warn('NAVER_CLIENT_ID/SECRET 환경변수 미설정 — 네이버 검색 비활성');
      return { items: [], reason: 'missing_credentials' };
    }
    if (!query || query.trim().length < 2) return { items: [], reason: 'query_too_short' };

    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&start=1&sort=random`;
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
        return { items: [], reason: `naver_error_${res.status}` };
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
        this.logger.log(`Naver 검색 결과 0 (query="${query}" total=${data.total ?? 0})`);
        return { items: [], reason: `zero_results_total_${data.total ?? 0}` };
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
      return { items, reason: 'ok' };
    } catch (err) {
      this.logger.error('Naver 검색 예외', err);
      return { items: [], reason: 'exception' };
    }
  }
}
