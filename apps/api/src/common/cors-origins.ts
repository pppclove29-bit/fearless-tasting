/**
 * 앱 웹뷰 출처.
 *
 * 앱은 원격 URL이 아니라 로컬 정적 번들을 웹뷰에서 열기 때문에(docs/app-release.md §1)
 * 웹(musikga.kr)과 출처가 다르다. Android는 https://localhost, iOS는 capacitor://localhost.
 */
const CAPACITOR_ORIGINS = ['https://localhost', 'capacitor://localhost'];

/** 끝 슬래시 제거 — Origin 헤더에는 끝 슬래시가 붙지 않으므로 붙은 채로 두면 영원히 불일치한다 */
function normalize(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

/**
 * CORS 허용 출처 목록 계산.
 *
 * 와일드카드나 부분 일치를 쓰지 않는다. cors 라이브러리가 이 배열과 Origin 헤더를
 * 정확 일치로 비교하므로, 서브도메인·접미 공격·스킴 불일치는 자동으로 걸러진다.
 * 임의 출처를 반사(origin: true)하면 credentials: true 와 조합돼 위험해지므로 금지.
 */
export function buildAllowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const extra = (env.CORS_EXTRA_ORIGINS ?? '').split(',');

  const origins = [env.FRONTEND_URL || 'http://localhost:4321', ...CAPACITOR_ORIGINS, ...extra]
    .map(normalize)
    .filter((origin) => origin.length > 0);

  return [...new Set(origins)];
}
