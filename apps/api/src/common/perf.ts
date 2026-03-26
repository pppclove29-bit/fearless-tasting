import { Logger } from '@nestjs/common';

const logger = new Logger('Perf');

/**
 * 함수 실행 시간을 측정하고 로깅합니다.
 *
 * @example
 * const user = await measure('AuthService.getUserProfile', () =>
 *   this.prisma.read.user.findUnique({ where: { id } }),
 * );
 */
export async function measure<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - start);

  if (ms >= 500) {
    logger.warn(`[SLOW] ${label} ${ms}ms`);
  } else if (ms >= 100) {
    logger.log(`${label} ${ms}ms`);
  } else {
    logger.debug(`${label} ${ms}ms`);
  }

  return result;
}
