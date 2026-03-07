import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const ms = Date.now() - start;
      const status = res.statusCode;
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'log';

      const message = `${method} ${originalUrl} ${status} ${ms}ms`;

      if (level === 'error') {
        this.logger.error(message);
      } else if (level === 'warn') {
        this.logger.warn(message);
      } else if (ms > 1000) {
        this.logger.warn(`[SLOW] ${message}`);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
