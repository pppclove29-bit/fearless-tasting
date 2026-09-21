import { buildAllowedOrigins } from './cors-origins';

/**
 * CORS 허용 출처 계산 테스트.
 *
 * 이 목록은 운영 API가 어떤 출처의 브라우저 요청을 받아줄지 결정한다.
 * 좁히면 웹이 죽고, 넓히면 아무 사이트나 로그인된 사용자 대신 API를 부를 수 있다.
 * 그래서 "누가 들어오는가"만이 아니라 "누가 못 들어오는가"까지 고정한다.
 */
describe('buildAllowedOrigins', () => {
  const WEB = 'https://musikga.kr';

  describe('허용되어야 하는 출처', () => {
    it('기존 웹 출처(FRONTEND_URL)를 그대로 허용한다', () => {
      // 회귀 감시: 이게 깨지면 운영 웹 전체가 CORS로 막힌다.
      expect(buildAllowedOrigins({ FRONTEND_URL: WEB })).toContain(WEB);
    });

    it('앱 웹뷰 출처(https://localhost)를 허용한다', () => {
      // 앱은 로컬 정적 번들이라 Android 웹뷰 origin이 https://localhost 다.
      expect(buildAllowedOrigins({ FRONTEND_URL: WEB })).toContain('https://localhost');
    });

    it('iOS Capacitor 출처(capacitor://localhost)를 허용한다', () => {
      expect(buildAllowedOrigins({ FRONTEND_URL: WEB })).toContain('capacitor://localhost');
    });

    it('FRONTEND_URL이 없으면 개발 기본값으로 폴백한다', () => {
      expect(buildAllowedOrigins({})).toContain('http://localhost:4321');
    });
  });

  describe('차단되어야 하는 출처', () => {
    // 아래 4개는 허용 목록이 "정확 일치"임을 고정한다.
    // 부분 일치나 정규식으로 잘못 구현하면 전부 통과해 버린다.
    it.each([
      ['무관한 도메인', 'https://evil.example'],
      ['서브도메인', 'https://evil.musikga.kr'],
      ['접미 공격', 'https://musikga.kr.evil.com'],
      ['스킴 불일치', 'http://musikga.kr'],
    ])('%s(%s)는 허용하지 않는다', (_label, origin) => {
      expect(buildAllowedOrigins({ FRONTEND_URL: WEB })).not.toContain(origin);
    });
  });

  describe('환경변수 정규화', () => {
    it('FRONTEND_URL의 끝 슬래시를 제거한다', () => {
      // Origin 헤더에는 끝 슬래시가 절대 붙지 않는다.
      // 정규화하지 않으면 'https://musikga.kr/' 가 실제 요청과 영원히 불일치해
      // 운영 웹이 통째로 막힌다.
      const origins = buildAllowedOrigins({ FRONTEND_URL: 'https://musikga.kr/' });
      expect(origins).toContain(WEB);
      expect(origins).not.toContain('https://musikga.kr/');
    });

    it('CORS_EXTRA_ORIGINS의 항목을 공백 제거 후 추가한다', () => {
      const origins = buildAllowedOrigins({
        FRONTEND_URL: WEB,
        CORS_EXTRA_ORIGINS: ' https://a.example , https://b.example ',
      });
      expect(origins).toContain('https://a.example');
      expect(origins).toContain('https://b.example');
    });

    it('CORS_EXTRA_ORIGINS가 비면 빈 문자열 항목을 만들지 않는다', () => {
      // ''가 목록에 들어가면 Origin 헤더 없는 요청과 헷갈릴 여지가 생긴다.
      const origins = buildAllowedOrigins({ FRONTEND_URL: WEB, CORS_EXTRA_ORIGINS: '' });
      expect(origins).not.toContain('');
      expect(origins.every((o) => o.length > 0)).toBe(true);
    });

    it('중복을 제거한다', () => {
      // 개발 환경에서 FRONTEND_URL이 앱 출처와 같을 수 있다.
      const origins = buildAllowedOrigins({ FRONTEND_URL: 'https://localhost' });
      expect(origins.filter((o) => o === 'https://localhost')).toHaveLength(1);
    });
  });
});
