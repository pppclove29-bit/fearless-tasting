/**
 * "오늘 뭐 먹지?" 바텀시트. 고르는 규칙은 recommend.ts, 여기서는 화면·위치·카카오 장소 검색만 한다.
 * 사용자 입력(식당·카테고리 이름)은 전부 textContent로 넣는다.
 */
import {
  type LatLng,
  type RecMode,
  type RecRestaurant,
  centroid,
  destination,
  distanceKm,
  favoriteCategory,
  leastVisitedDirection,
  normalizeName,
  pickFromRoom,
  pickRandom,
  untriedCategories,
} from './recommend';
import { createRoomRestaurant, RestaurantDuplicateError, showToast } from './api';
import { trackEvent } from './analytics';
import { openExternal } from './native';

interface KakaoPlace {
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
}

interface KakaoPlaces {
  keywordSearch(
    q: string,
    cb: (data: KakaoPlace[], status: string) => void,
    opts: Record<string, string | number | object>,
  ): void;
  categorySearch(
    code: string,
    cb: (data: KakaoPlace[], status: string) => void,
    opts: Record<string, string | number | object>,
  ): void;
}

interface KakaoMaps {
  load(cb: () => void): void;
  LatLng: new (lat: number, lng: number) => object;
  services: { Places: new () => KakaoPlaces; Status: { OK: string; ZERO_RESULT: string } };
}

export interface RecommendOptions {
  roomId: string;
  restaurants: RecRestaurant[];
  /** 위시리스트 탭을 끈 방이면 "위시리스트에 담기"를 숨긴다 (담아도 보이지 않는 탭으로 들어가므로) */
  wishlistEnabled: boolean;
  /** 위시리스트에 담은 뒤 방 화면을 갱신 */
  onWishlistAdded: () => void;
}

const MODES: { mode: RecMode; label: string }[] = [
  { mode: 'random', label: '🎲 아무거나' },
  { mode: 'wishlist', label: '💛 위시리스트' },
  { mode: 'revisit', label: '🔁 또 갈 곳' },
  { mode: 'nearby', label: '📍 내 주변' },
  { mode: 'new-category', label: '🆕 안 먹어본 종류' },
  { mode: 'similar', label: '😋 좋아하는 종류' },
  { mode: 'new-direction', label: '🧭 안 가본 방향' },
];

const PROVINCE: Record<string, string> = {
  서울: '서울특별시',
  부산: '부산광역시',
  대구: '대구광역시',
  인천: '인천광역시',
  광주: '광주광역시',
  대전: '대전광역시',
  울산: '울산광역시',
  세종: '세종특별자치시',
  경기: '경기도',
  강원: '강원특별자치도',
  충북: '충청북도',
  충남: '충청남도',
  전북: '전북특별자치도',
  전남: '전라남도',
  경북: '경상북도',
  경남: '경상남도',
  제주: '제주특별자치도',
};

// ─── 카카오 장소 검색 ───

let kakaoReady: Promise<KakaoMaps | null> | null = null;

/** 카카오 지도 SDK 준비. 도메인 제한(앱 웹뷰 등)이나 로드 실패면 null — 무한 대기하지 않는다 */
function loadKakao(timeoutMs = 6000): Promise<KakaoMaps | null> {
  if (kakaoReady) return kakaoReady;
  const ready = new Promise<KakaoMaps | null>((resolve) => {
    const started = Date.now();
    const tick = () => {
      const maps = (window as unknown as { kakao?: { maps?: KakaoMaps } }).kakao?.maps;
      if (maps?.load) {
        // load 콜백이 안 오는 경우(서브모듈 로드 실패)도 타임아웃으로 끝낸다
        const timer = setTimeout(
          () => resolve(null),
          Math.max(1000, timeoutMs - (Date.now() - started)),
        );
        maps.load(() => {
          clearTimeout(timer);
          resolve(maps.services ? maps : null);
        });
        return;
      }
      if (Date.now() - started > timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(tick, 150);
    };
    tick();
  }).then((m) => {
    if (!m) kakaoReady = null; // 다음에 다시 시도할 수 있게
    return m;
  });
  kakaoReady = ready;
  return ready;
}

function searchPlaces(
  maps: KakaoMaps,
  kind: { keyword: string } | { category: string },
  at: LatLng,
  radius: number,
  group = 'FD6',
): Promise<KakaoPlace[] | null> {
  // null = 검색 자체가 실패(도메인 미등록·네트워크 등). 빈 배열 = 정상 응답인데 결과 없음
  return new Promise((resolve) => {
    const places = new maps.services.Places();
    const opts = { location: new maps.LatLng(at.lat, at.lng), radius };
    const { OK, ZERO_RESULT } = maps.services.Status;
    const done = (data: KakaoPlace[], status: string) =>
      resolve(status === OK ? data : status === ZERO_RESULT ? [] : null);
    if ('keyword' in kind)
      places.keywordSearch(kind.keyword, done, { ...opts, category_group_code: group });
    else places.categorySearch(kind.category, done, opts);
  });
}

function lastCategory(p: KakaoPlace): string {
  const parts = (p.category_name || '').split(' > ');
  const last = parts[parts.length - 1] || '';
  return last && last !== '음식점' ? last : '음식점';
}

// ─── 위치 ───

let cachedPosition: LatLng | null = null;

function currentPosition(): Promise<LatLng | null> {
  if (cachedPosition) return Promise.resolve(cachedPosition);
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve(cachedPosition);
      },
      () => resolve(null),
      { timeout: 7000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

// ─── 결과 모델 ───

type Result =
  | { kind: 'room'; restaurant: RecRestaurant; reason: string }
  | { kind: 'place'; place: KakaoPlace; reason: string; distanceKm: number | null }
  | { kind: 'empty'; message: string };

const CONNECT_FAIL =
  '지도 검색에 연결하지 못했어요. 위 세 가지(아무거나·위시리스트·또 갈 곳)는 쓸 수 있어요.';

function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 100) * 10}m` : `${km.toFixed(1)}km`;
}

async function draw(mode: RecMode, opts: RecommendOptions): Promise<Result> {
  const rs = opts.restaurants;

  if (mode === 'random' || mode === 'wishlist' || mode === 'revisit') {
    const pick = pickFromRoom(mode, rs);
    if (!pick) {
      const message =
        mode === 'wishlist'
          ? '위시리스트가 비어 있어요. 가고 싶은 곳을 먼저 담아보세요.'
          : mode === 'revisit'
            ? '아직 평점 높은 단골이 없어요. 리뷰가 쌓이면 추천해 드릴게요.'
            : '방에 식당이 아직 없어요.';
      return { kind: 'empty', message };
    }
    const reason =
      mode === 'wishlist'
        ? '위시리스트에 담아둔 곳이에요'
        : mode === 'revisit'
          ? `우리 평균 ★${(pick.avgRating ?? 0).toFixed(1)} — 또 가도 좋을 곳`
          : '우리 방 식당 중 무작위로 골랐어요';
    return { kind: 'room', restaurant: pick, reason };
  }

  // 새 식당 찾기: 위치 → 없으면 우리 방 식당들의 중심
  const here = await currentPosition();
  const base = here ?? centroid(rs);
  if (!base)
    return {
      kind: 'empty',
      message: '위치를 허용하거나 식당을 하나 이상 등록하면 주변을 찾아드려요.',
    };
  const baseNote = here ? '' : ' (우리 방 식당들 중심 기준)';

  const maps = await loadKakao();
  if (!maps) return { kind: 'empty', message: CONNECT_FAIL };

  let found: KakaoPlace[] | null = [];
  let reason = '';
  if (mode === 'nearby') {
    found = await searchPlaces(maps, { category: 'FD6' }, base, 1000);
    reason = `가까운 식당 중에서 골랐어요${baseNote}`;
  } else if (mode === 'new-category') {
    const keyword = pickRandom(untriedCategories(rs));
    if (!keyword)
      return { kind: 'empty', message: '웬만한 종류는 다 드셔보셨네요! 다른 모드를 눌러보세요.' };
    found = await searchPlaces(
      maps,
      { keyword },
      base,
      3000,
      keyword === '디저트' || keyword === '브런치' ? 'CE7' : 'FD6',
    );
    reason = `우리 방에 아직 없는 '${keyword}'${baseNote}`;
  } else if (mode === 'similar') {
    const fav = favoriteCategory(rs);
    if (!fav) return { kind: 'empty', message: '리뷰가 쌓이면 좋아하는 종류를 알아낼 수 있어요.' };
    found = await searchPlaces(maps, { keyword: fav }, base, 3000);
    reason = `우리가 좋아하는 '${fav}' 중 아직 안 가본 곳${baseNote}`;
  } else {
    const dir = leastVisitedDirection(base, rs);
    const target = destination(base, dir.octant * 45, 1.5);
    found = await searchPlaces(maps, { category: 'FD6' }, target, 800);
    reason = `우리가 잘 안 가는 ${dir.label}으로 1.5km${baseNote}`;
  }

  if (found === null) return { kind: 'empty', message: CONNECT_FAIL };

  const known = new Set(rs.map((r) => normalizeName(r.name)));
  const fresh = found.filter((p) => !known.has(normalizeName(p.place_name)));
  const place = pickRandom(fresh);
  if (!place)
    return {
      kind: 'empty',
      message: '조건에 맞는 새 식당을 찾지 못했어요. 다시 뽑거나 다른 모드를 눌러보세요.',
    };
  const km = here ? distanceKm(here, { lat: Number(place.y), lng: Number(place.x) }) : null;
  return { kind: 'place', place, reason, distanceKm: km };
}

// ─── 화면 ───

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function openRecommendSheet(opts: RecommendOptions): void {
  document.querySelector('.rec-backdrop')?.remove();
  trackEvent('recommend_opened', { room_id: opts.roomId });

  const backdrop = el('div', 'rec-backdrop');
  const sheet = el('div', 'rec-sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', '오늘 뭐 먹지');

  const head = el('div', 'rec-head');
  head.append(el('h2', 'rec-title', '오늘 뭐 먹지?'));
  const close = el('button', 'rec-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', '닫기');
  head.append(close);

  const chips = el('div', 'rec-chips');
  const result = el('div', 'rec-result');
  sheet.append(head, chips, result);
  backdrop.append(sheet);
  document.body.append(backdrop);

  let currentMode: RecMode = 'random';
  let drawing = false;

  const closeSheet = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeSheet();
  };
  document.addEventListener('keydown', onKey);
  close.addEventListener('click', closeSheet);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeSheet();
  });

  for (const { mode, label } of MODES) {
    const chip = el('button', 'rec-chip', label);
    chip.type = 'button';
    chip.dataset.mode = mode;
    chip.addEventListener('click', () => {
      if (drawing) return; // 고르는 중에 모드만 바뀌어 결과와 어긋나지 않게
      currentMode = mode;
      run();
    });
    chips.append(chip);
  }

  function renderResult(r: Result) {
    result.replaceChildren();
    if (r.kind === 'empty') {
      result.append(el('p', 'rec-empty', r.message));
    } else {
      const card = el('div', 'rec-card');
      const name = r.kind === 'room' ? r.restaurant.name : r.place.place_name;
      const category = r.kind === 'room' ? r.restaurant.category : lastCategory(r.place);
      const meta = [category];
      if (r.kind === 'room' && r.restaurant.avgRating !== null)
        meta.push(`★ ${r.restaurant.avgRating.toFixed(1)}`);
      if (r.kind === 'place' && r.distanceKm !== null) meta.push(formatKm(r.distanceKm));
      card.append(
        el('div', 'rec-name', name),
        el('div', 'rec-meta', meta.join(' · ')),
        el('div', 'rec-reason', r.reason),
      );
      result.append(card);

      const actions = el('div', 'rec-actions');
      if (r.kind === 'room') {
        const go = el('a', 'rec-btn rec-btn-primary', '식당 보기');
        go.href = `/room/restaurant?roomId=${encodeURIComponent(opts.roomId)}&id=${encodeURIComponent(r.restaurant.id)}`;
        actions.append(go);
      } else {
        const map = el(
          'button',
          opts.wishlistEnabled ? 'rec-btn' : 'rec-btn rec-btn-primary',
          '지도에서 보기',
        );
        map.type = 'button';
        map.addEventListener('click', () => {
          openExternal(r.place.place_url);
        });
        if (opts.wishlistEnabled) {
          const add = el('button', 'rec-btn rec-btn-primary', '💛 위시리스트에 담기');
          add.type = 'button';
          add.addEventListener('click', () => addToWishlist(r.place, add));
          actions.append(add);
        }
        actions.append(map);
      }
      result.append(actions);
    }
    const again = el('button', 'rec-again', '🎲 다시 뽑기');
    again.type = 'button';
    again.addEventListener('click', run);
    result.append(again);
  }

  async function addToWishlist(place: KakaoPlace, btn: HTMLButtonElement) {
    btn.disabled = true;
    const parts = place.address_name.split(' ').filter(Boolean);
    try {
      await createRoomRestaurant(opts.roomId, {
        name: place.place_name,
        address: place.address_name,
        province: PROVINCE[parts[0] ?? ''] || parts[0] || '',
        city: parts[1] || '',
        neighborhood: parts[2] || '',
        category: lastCategory(place),
        latitude: Number(place.y) || undefined,
        longitude: Number(place.x) || undefined,
        isWishlist: true,
        isClosed: false,
      } as Parameters<typeof createRoomRestaurant>[1]);
      trackEvent('recommend_wishlisted', { room_id: opts.roomId, mode: currentMode });
      showToast('위시리스트에 담았어요!', 'success');
      btn.textContent = '담았어요 ✓';
      opts.onWishlistAdded();
    } catch (err) {
      btn.disabled = false;
      if (err instanceof RestaurantDuplicateError)
        showToast('이미 우리 방에 있는 식당이에요.', 'info');
      else showToast(err instanceof Error ? err.message : '위시리스트에 담지 못했어요.');
    }
  }

  async function run() {
    if (drawing) return;
    drawing = true;
    chips.querySelectorAll<HTMLButtonElement>('.rec-chip').forEach((c) => {
      c.classList.toggle('active', c.dataset.mode === currentMode);
    });
    result.replaceChildren(el('p', 'rec-loading', '고르는 중…'));
    try {
      const r = await draw(currentMode, opts);
      renderResult(r);
      trackEvent('recommend_drawn', { room_id: opts.roomId, mode: currentMode, result: r.kind });
    } catch {
      renderResult({ kind: 'empty', message: '추천을 가져오지 못했어요. 다시 시도해 주세요.' });
    } finally {
      drawing = false;
    }
  }

  run();
}
