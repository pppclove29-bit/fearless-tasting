/**
 * Cloudflare Workers Cron — API keep-alive.
 * 14분마다 /health 엔드포인트를 호출하여 Render 무료 플랜 슬립 방지.
 */

interface Env {
  PUBLIC_API_URL: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const url = `${env.PUBLIC_API_URL}/health`;

    ctx.waitUntil(
      fetch(url, { method: 'GET' })
        .then(async (res) => {
          const body = await res.text();
          console.log(`[keep-alive] ${res.status} ${body}`);
        })
        .catch((err) => {
          console.error(`[keep-alive] failed: ${err.message}`);
        }),
    );
  },

  // HTTP 요청 시 수동 트리거 가능 (디버깅용)
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = `${env.PUBLIC_API_URL}/health`;

    try {
      const res = await fetch(url);
      const body = await res.text();
      return new Response(`ping: ${res.status} ${body}`, { status: 200 });
    } catch (err) {
      return new Response(`ping failed: ${(err as Error).message}`, { status: 502 });
    }
  },
};
