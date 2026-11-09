import {
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function run(exception: Error) {
  const json = jest.fn((body: Record<string, string | number | boolean | null>) => body);
  const res = { status: jest.fn((code: number) => ({ json, code })) };
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({ method: 'POST', originalUrl: '/test' }),
    }),
  } as never as ArgumentsHost;
  const filter = new AllExceptionsFilter();
  jest.spyOn(Reflect.get(filter, 'logger'), 'error').mockImplementation(() => undefined);
  jest.spyOn(Reflect.get(filter, 'logger'), 'warn').mockImplementation(() => undefined);
  filter.catch(exception, host);
  return { status: res.status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe('AllExceptionsFilter', () => {
  it('HttpException에 실은 부가 필드(existingId 등)를 응답에 그대로 전달한다', () => {
    const { status, body } = run(
      new ConflictException({
        message: '이미 등록된 식당입니다.',
        existingId: 'r1',
        isWishlist: false,
      }),
    );
    expect(status).toBe(409);
    expect(body).toMatchObject({
      statusCode: 409,
      message: '이미 등록된 식당입니다.',
      existingId: 'r1',
      isWishlist: false,
    });
  });

  it('예상 못 한 에러의 원본 메시지는 숨긴다', () => {
    const { status, body } = run(
      new Error('Invalid `tx.roomReview.create()` invocation in /srv/app.ts'),
    );
    expect(status).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('roomReview');
  });

  it('의도적으로 던진 5xx HttpException 메시지는 그대로 보여준다', () => {
    const { body } = run(new InternalServerErrorException('GitHub Issue 생성에 실패했습니다'));
    expect(body.message).toBe('GitHub Issue 생성에 실패했습니다');
  });

  it('검증 에러는 기존처럼 statusCode/message만 내려가고 error 필드는 덧붙이지 않는다', () => {
    const { body } = run(new BadRequestException(['visit should not be null or undefined']));
    expect(body.statusCode).toBe(400);
    expect(body).not.toHaveProperty('error');
  });
});
