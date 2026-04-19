import { Injectable } from '@nestjs/common';

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
  /** 네이버 로컬 장소 검색 (최대 5개 — Naver Open API 제약) */
  async searchNaver(query: string): Promise<PlaceResult[]> {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) return [];
    if (!query || query.trim().length < 2) return [];

    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&start=1&sort=random`;
    try {
      const res = await fetch(url, {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      });
      if (!res.ok) return [];
      const data = await res.json() as {
        items: Array<{
          title: string;
          category: string;
          telephone: string;
          address: string;
          roadAddress: string;
          mapx: string;
          mapy: string;
        }>;
      };
      return (data.items || []).map((item) => ({
        source: 'naver' as const,
        name: stripHtmlTags(item.title),
        address: item.address,
        roadAddress: item.roadAddress,
        category: item.category,
        telephone: item.telephone,
        mapx: item.mapx,
        mapy: item.mapy,
      }));
    } catch {
      return [];
    }
  }
}
