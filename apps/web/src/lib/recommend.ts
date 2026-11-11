/**
 * "오늘 뭐 먹지?" 추천 로직 (DOM·네트워크 없음 — 순수 함수만).
 *
 * 방에 쌓인 식당 데이터만으로 고르는 모드(랜덤·위시리스트·다시 가볼까)와,
 * 카카오 장소 검색으로 새 식당을 찾는 모드(내 주변·안 먹어본 종류·비슷한 종류·안 가본 방향)가 있다.
 * 후자의 "어디를 어떤 키워드로 찾을지"를 여기서 정하고, 실제 검색은 recommend-ui.ts가 한다.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RecRestaurant {
  id: string;
  name: string;
  category: string;
  latitude?: number | null;
  longitude?: number | null;
  avgRating: number | null;
  isWishlist: boolean;
  isClosed: boolean;
  visitCount: number;
}

export type RecMode =
  | 'random'
  | 'wishlist'
  | 'revisit'
  | 'nearby'
  | 'new-category'
  | 'similar'
  | 'new-direction';

export const DIRECTION_LABELS = [
  '북쪽',
  '북동쪽',
  '동쪽',
  '남동쪽',
  '남쪽',
  '남서쪽',
  '서쪽',
  '북서쪽',
] as const;

/**
 * "안 먹어본 종류" 후보. 카카오 키워드 검색어로 쓰이므로 검색이 잘 되는 일반 명사로 둔다.
 * aliases: 방에 저장된 카테고리 문자열에 이 단어 중 하나라도 들어 있으면 "먹어봤다"로 본다.
 */
export const CATEGORY_CANDIDATES: { keyword: string; aliases: string[] }[] = [
  { keyword: '한식', aliases: ['한식', '백반', '한정식'] },
  { keyword: '국밥', aliases: ['국밥', '해장국', '순대'] },
  { keyword: '고기', aliases: ['고기', '삼겹', '갈비', '육류'] },
  { keyword: '중식', aliases: ['중식', '중국', '짜장', '마라'] },
  { keyword: '일식', aliases: ['일식', '일본'] },
  { keyword: '초밥', aliases: ['초밥', '스시', '회'] },
  { keyword: '라멘', aliases: ['라멘', '라면'] },
  { keyword: '돈까스', aliases: ['돈까스', '돈가스', '카츠'] },
  { keyword: '양식', aliases: ['양식', '파스타', '이탈리', '스테이크'] },
  { keyword: '피자', aliases: ['피자'] },
  { keyword: '햄버거', aliases: ['햄버거', '버거'] },
  { keyword: '치킨', aliases: ['치킨', '닭강정'] },
  { keyword: '분식', aliases: ['분식', '떡볶이', '김밥'] },
  { keyword: '쌀국수', aliases: ['쌀국수', '베트남'] },
  { keyword: '태국음식', aliases: ['태국', '팟타이'] },
  { keyword: '인도음식', aliases: ['인도', '커리', '카레'] },
  { keyword: '멕시칸', aliases: ['멕시', '타코', '부리또'] },
  { keyword: '해산물', aliases: ['해산물', '해물', '조개', '새우', '낙지', '게'] },
  { keyword: '샐러드', aliases: ['샐러드', '포케'] },
  { keyword: '브런치', aliases: ['브런치', '샌드위치', '베이글'] },
  { keyword: '디저트', aliases: ['디저트', '베이커리', '빵', '케이크'] },
];

/** 0 이상 1 미만 난수 (테스트에서 고정값을 넣을 수 있게 주입) */
export type Rng = () => number;

export function pickRandom<T>(items: readonly T[], rng: Rng = Math.random): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(rng() * items.length)] ?? null;
}

function hasCoords(r: RecRestaurant): r is RecRestaurant & { latitude: number; longitude: number } {
  return typeof r.latitude === 'number' && typeof r.longitude === 'number';
}

/** 방 데이터만으로 고르는 모드. 후보가 없으면 null */
export function pickFromRoom(
  mode: 'random' | 'wishlist' | 'revisit',
  restaurants: readonly RecRestaurant[],
  rng: Rng = Math.random,
): RecRestaurant | null {
  const open = restaurants.filter((r) => !r.isClosed);
  if (mode === 'wishlist')
    return pickRandom(
      open.filter((r) => r.isWishlist),
      rng,
    );
  if (mode === 'revisit') {
    // 가본 곳 중 평점 4점 이상. 없으면 3.5점 이상으로 완화
    const visited = open.filter((r) => !r.isWishlist && r.visitCount > 0 && r.avgRating !== null);
    const great = visited.filter((r) => (r.avgRating ?? 0) >= 4);
    return pickRandom(
      great.length > 0 ? great : visited.filter((r) => (r.avgRating ?? 0) >= 3.5),
      rng,
    );
  }
  return pickRandom(open, rng);
}

/** 좌표 있는 식당들의 중심점 */
export function centroid(restaurants: readonly RecRestaurant[]): LatLng | null {
  const pts = restaurants.filter(hasCoords);
  if (pts.length === 0) return null;
  return {
    lat: pts.reduce((s, r) => s + r.latitude, 0) / pts.length,
    lng: pts.reduce((s, r) => s + r.longitude, 0) / pts.length,
  };
}

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** a에서 b를 바라보는 방위각 (0=북, 90=동) */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** 방위각을 8방위 인덱스로 (0=북 … 7=북서) */
export function octantOf(deg: number): number {
  return Math.round(deg / 45) % 8;
}

/** 기준점에서 방위·거리만큼 이동한 지점 */
export function destination(from: LatLng, bearing: number, km: number): LatLng {
  const d = km / 6371;
  const b = toRad(bearing);
  const lat1 = toRad(from.lat);
  const lng1 = toRad(from.lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(b) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

/**
 * 기준점에서 본 8방위 중 방 식당이 가장 적은 방향.
 * 기준점 근처(150m 안)는 방향이 의미 없으니 뺀다. 동률이면 무작위.
 */
export function leastVisitedDirection(
  center: LatLng,
  restaurants: readonly RecRestaurant[],
  rng: Rng = Math.random,
): { octant: number; label: string; counts: number[] } {
  const counts = new Array<number>(8).fill(0);
  for (const r of restaurants.filter(hasCoords)) {
    const p = { lat: r.latitude, lng: r.longitude };
    if (distanceKm(center, p) < 0.15) continue;
    counts[octantOf(bearingDeg(center, p))] += 1;
  }
  const min = Math.min(...counts);
  const candidates = counts.map((c, i) => (c === min ? i : -1)).filter((i) => i >= 0);
  const octant = pickRandom(candidates, rng) ?? 0;
  return { octant, label: DIRECTION_LABELS[octant], counts };
}

/** 방에 저장된 카테고리 문자열들 기준으로 아직 안 먹어본 후보 키워드 */
export function untriedCategories(restaurants: readonly RecRestaurant[]): string[] {
  const eaten = restaurants.filter((r) => !r.isWishlist).map((r) => r.category.toLowerCase());
  return CATEGORY_CANDIDATES.filter(
    (c) => !c.aliases.some((a) => eaten.some((cat) => cat.includes(a.toLowerCase()))),
  ).map((c) => c.keyword);
}

/** 평점 4점 이상 받은 식당이 가장 많은 카테고리 (없으면 가장 많이 간 카테고리) */
export function favoriteCategory(restaurants: readonly RecRestaurant[]): string | null {
  const visited = restaurants.filter(
    (r) => !r.isWishlist && r.visitCount > 0 && r.category && r.category !== '기타',
  );
  if (visited.length === 0) return null;
  const score = new Map<string, number>();
  for (const r of visited) {
    const w = (r.avgRating ?? 0) >= 4 ? 3 : 1;
    score.set(r.category, (score.get(r.category) ?? 0) + w);
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** 이름 비교용 정규화 (공백·지점명 괄호 제거) — 이미 방에 있는 식당을 새 추천에서 빼는 데 쓴다 */
export function normalizeName(name: string): string {
  return name
    .replace(/\s+/g, '')
    .replace(/\(.*?\)/g, '')
    .toLowerCase();
}
