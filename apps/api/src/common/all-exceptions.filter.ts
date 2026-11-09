import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ method: string; originalUrl: string }>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.message
      : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    // 4xx는 warn, 5xx는 error + 스택트레이스
    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.originalUrl} ${status} — ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn(`${req.method} ${req.originalUrl} ${status} — ${message}`);
    }

    // HttpException에 객체로 실어 보낸 부가 필드(예: 중복 식당의 existingId)는 그대로 전달한다.
    // statusCode/message/error는 위에서 정한 값으로 통일
    const extra: Record<string, string | number | boolean | null> = {};
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        for (const [key, value] of Object.entries(body)) {
          if (key === 'statusCode' || key === 'message' || key === 'error') continue;
          if (['string', 'number', 'boolean'].includes(typeof value) || value === null) extra[key] = value;
        }
      }
    }

    res.status(status).json({
      statusCode: status,
      // 예상 못 한 에러(Prisma 쿼리·파일 경로 등 원본 메시지)는 로그에만 남기고 클라이언트에는 숨긴다.
      // 의도적으로 던진 HttpException 메시지는 그대로 보여준다
      message: exception instanceof HttpException ? message : 'Internal server error',
      ...extra,
      timestamp: new Date().toISOString(),
    });
  }
}
