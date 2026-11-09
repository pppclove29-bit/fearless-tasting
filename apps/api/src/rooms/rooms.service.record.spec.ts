import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RoomsService } from './rooms.service';
import { CreateRoomRecordDto } from './dto/create-room-record.dto';
import type { PrismaService } from '../prisma/prisma.service';
import type { FcmService } from '../fcm/fcm.service';
import type { StorageService } from '../storage/storage.service';
import type { CategoriesService } from '../categories/categories.service';

const NEW_RESTAURANT = {
  name: '돈까스집',
  address: '서울특별시 강남구 역삼동 1',
  province: '서울특별시',
  city: '강남구',
  neighborhood: '역삼동',
  category: '일식',
};
const VISIT = { visitedAt: '2026-11-09' };
const REVIEW = { rating: 4.5, content: '맛있음' };

function setup() {
  const tx = {
    roomRestaurant: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'rest1', name: '돈까스집' }),
      update: jest.fn(),
    },
    roomVisit: { create: jest.fn().mockResolvedValue({ id: 'visit1' }) },
    roomReview: { create: jest.fn().mockResolvedValue({ id: 'review1' }) },
  };
  const read = { user: { findUnique: jest.fn().mockResolvedValue({ nickname: '형준' }) } };
  // 실제 DB에서는 콜백이 throw하면 롤백된다. 여기서는 콜백을 그대로 실행해 호출 순서/중단만 검증한다
  const write = { $transaction: jest.fn((fn: (t: typeof tx) => Promise<object>) => fn(tx)) };
  const prisma: PrismaService = { read, write } as never;
  const categories = {
    resolve: jest.fn().mockResolvedValue({ categoryId: 'cat1', displayName: '일식' }),
  };
  const service = new RoomsService(
    prisma,
    {} as FcmService,
    {} as StorageService,
    categories as never as CategoriesService,
  );
  const notify = jest.spyOn(service, 'createNotificationForRoom').mockResolvedValue(undefined);
  return { service, tx, notify };
}

describe('RoomsService.createRecord', () => {
  it('새 식당 + 방문 + 리뷰를 한 트랜잭션에서 만들고 알림 3개를 커밋 후 보낸다', async () => {
    const { service, tx, notify } = setup();

    const result = await service.createRecord('room1', 'user1', {
      restaurant: NEW_RESTAURANT,
      visit: VISIT,
      review: REVIEW,
    });

    expect(result).toEqual({
      restaurantId: 'rest1',
      visitId: 'visit1',
      reviewId: 'review1',
      isNewRestaurant: true,
    });
    expect(tx.roomRestaurant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roomId: 'room1', addedById: 'user1', categoryId: 'cat1' }),
      }),
    );
    expect(tx.roomVisit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ restaurantId: 'rest1' }) }),
    );
    expect(tx.roomReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ visitId: 'visit1', rating: 4.5, wouldRevisit: 4 }),
      }),
    );
    expect(notify.mock.calls.map((c) => c[2])).toEqual([
      'restaurant_added',
      'visit_added',
      'review_added',
    ]);
  });

  it('기존 식당이면 식당을 만들지 않고, clearWishlist면 위시리스트를 해제한다', async () => {
    const { service, tx, notify } = setup();
    tx.roomRestaurant.findFirst.mockResolvedValue({
      id: 'rest9',
      name: '단골집',
      isWishlist: true,
    });

    const result = await service.createRecord('room1', 'user1', {
      restaurantId: 'rest9',
      clearWishlist: true,
      visit: VISIT,
      review: REVIEW,
    });

    expect(result.isNewRestaurant).toBe(false);
    expect(tx.roomRestaurant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rest9', roomId: 'room1' } }),
    );
    expect(tx.roomRestaurant.create).not.toHaveBeenCalled();
    expect(tx.roomRestaurant.update).toHaveBeenCalledWith({
      where: { id: 'rest9' },
      data: { isWishlist: false },
    });
    expect(notify.mock.calls.map((c) => c[2])).toEqual(['visit_added', 'review_added']);
  });

  it('다른 방의 식당 ID면 404이고 방문·리뷰를 만들지 않는다', async () => {
    const { service, tx, notify } = setup();
    tx.roomRestaurant.findFirst.mockResolvedValue(null);

    await expect(
      service.createRecord('room1', 'user1', {
        restaurantId: 'other',
        visit: VISIT,
        review: REVIEW,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.roomVisit.create).not.toHaveBeenCalled();
    expect(tx.roomReview.create).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('같은 식당이 이미 있으면 409에 existingId를 담고 아무것도 만들지 않는다', async () => {
    const { service, tx } = setup();
    tx.roomRestaurant.findFirst.mockResolvedValue({ id: 'dup1', isWishlist: false });

    const err = await service
      .createRecord('room1', 'user1', { restaurant: NEW_RESTAURANT, visit: VISIT, review: REVIEW })
      .catch((e: ConflictException) => e);

    expect(err).toBeInstanceOf(ConflictException);
    expect((err as ConflictException).getResponse()).toMatchObject({ existingId: 'dup1' });
    expect(tx.roomRestaurant.create).not.toHaveBeenCalled();
    expect(tx.roomVisit.create).not.toHaveBeenCalled();
  });

  it('리뷰 저장이 실패하면 에러를 그대로 올리고 알림을 보내지 않는다 (트랜잭션 롤백 대상)', async () => {
    const { service, tx, notify } = setup();
    tx.roomReview.create.mockRejectedValue(new Error('db error'));

    await expect(
      service.createRecord('room1', 'user1', {
        restaurant: NEW_RESTAURANT,
        visit: VISIT,
        review: REVIEW,
      }),
    ).rejects.toThrow('db error');
    expect(notify).not.toHaveBeenCalled();
  });

  it('restaurantId와 restaurant를 둘 다 보내거나 둘 다 빼면 400', async () => {
    const { service } = setup();
    await expect(
      service.createRecord('room1', 'user1', { visit: VISIT, review: REVIEW }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createRecord('room1', 'user1', {
        restaurantId: 'r',
        restaurant: NEW_RESTAURANT,
        visit: VISIT,
        review: REVIEW,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CreateRoomRecordDto', () => {
  const validate = (body: object) =>
    validateSync(plainToInstance(CreateRoomRecordDto, body), { whitelist: true });

  it('중첩된 식당·방문·리뷰를 검증하고, 미입력 세부 평점(null)은 통과시킨다', () => {
    const errors = validate({
      restaurant: NEW_RESTAURANT,
      visit: VISIT,
      review: { ...REVIEW, tasteRating: null, valueRating: null },
    });
    expect(errors).toHaveLength(0);
  });

  it('중첩 객체 안의 잘못된 값도 잡는다', () => {
    const errors = validate({
      restaurant: { ...NEW_RESTAURANT, name: 123 },
      visit: { visitedAt: 'not-a-date' },
      review: { rating: 0 },
    });
    expect(errors.map((e) => e.property).sort()).toEqual(['restaurant', 'review', 'visit']);
  });

  it('방문·리뷰가 빠지면 거부한다', () => {
    const errors = validate({ restaurantId: 'r1' });
    expect(errors.map((e) => e.property).sort()).toEqual(['review', 'visit']);
  });
});
