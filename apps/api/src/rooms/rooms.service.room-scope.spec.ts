import { NotFoundException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { FcmService } from '../fcm/fcm.service';
import type { StorageService } from '../storage/storage.service';
import type { CategoriesService } from '../categories/categories.service';

/**
 * 방문·리뷰 API는 URL의 방(:id) 멤버십만 가드에서 확인한다.
 * 서비스가 visitId/reviewId가 그 방 소속인지 확인하지 않으면
 * A방 매니저가 B방 기록을 수정·삭제하거나 B방에 리뷰를 쓸 수 있다.
 * 여기서는 조회 조건에 방 ID가 들어가고, 못 찾으면 쓰기 없이 404가 나는지 검증한다.
 */
function setup() {
  const read = {
    roomVisit: { findFirst: jest.fn().mockResolvedValue(null) },
    roomReview: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    roomRestaurant: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const write = {
    roomVisit: { update: jest.fn(), delete: jest.fn() },
    roomReview: { create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  };
  const prisma: PrismaService = { read, write } as never;
  const service = new RoomsService(
    prisma,
    {} as FcmService,
    { deleteImage: jest.fn() } as never as StorageService,
    {} as CategoriesService,
  );
  return { service, read, write };
}

const ROOM_A = 'roomA';

describe('방문·리뷰 API의 방 범위 확인', () => {
  it('updateVisit: 다른 방 방문이면 매니저여도 404, 수정하지 않는다', async () => {
    const { service, read, write } = setup();
    await expect(
      service.updateVisit(ROOM_A, 'visitInB', 'u1', 'manager', { memo: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(read.roomVisit.findFirst).toHaveBeenCalledWith({
      where: { id: 'visitInB', restaurant: { roomId: ROOM_A } },
    });
    expect(write.roomVisit.update).not.toHaveBeenCalled();
  });

  it('removeVisit: 다른 방 방문이면 매니저여도 404, 삭제하지 않는다', async () => {
    const { service, read, write } = setup();
    await expect(service.removeVisit(ROOM_A, 'visitInB', 'u1', 'owner')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(read.roomVisit.findFirst).toHaveBeenCalledWith({
      where: { id: 'visitInB', restaurant: { roomId: ROOM_A } },
    });
    expect(write.roomVisit.delete).not.toHaveBeenCalled();
  });

  it('createReview: 다른 방 방문에는 리뷰를 쓸 수 없다', async () => {
    const { service, read, write } = setup();
    await expect(service.createReview(ROOM_A, 'visitInB', 'u1', 4)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(read.roomVisit.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'visitInB', restaurant: { roomId: ROOM_A } } }),
    );
    expect(write.roomReview.create).not.toHaveBeenCalled();
  });

  it('updateReview: 다른 방 리뷰면 404', async () => {
    const { service, read, write } = setup();
    await expect(
      service.updateReview(ROOM_A, 'revInB', 'u1', { rating: 5 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(read.roomReview.findFirst).toHaveBeenCalledWith({
      where: { id: 'revInB', visit: { restaurant: { roomId: ROOM_A } } },
    });
    expect(write.roomReview.update).not.toHaveBeenCalled();
  });

  it('removeReview: 다른 방 리뷰면 매니저여도 404, 삭제하지 않는다', async () => {
    const { service, read, write } = setup();
    await expect(service.removeReview(ROOM_A, 'revInB', 'u1', 'manager')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(read.roomReview.findFirst).toHaveBeenCalledWith({
      where: { id: 'revInB', visit: { restaurant: { roomId: ROOM_A } } },
    });
    expect(write.roomReview.delete).not.toHaveBeenCalled();
  });

  it('compareReviews: 다른 방 식당이면 404, 리뷰 조회도 방으로 한정한다', async () => {
    const { service, read } = setup();
    await expect(service.compareReviews(ROOM_A, 'restInB')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(read.roomRestaurant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'restInB', roomId: ROOM_A } }),
    );
    expect(read.roomReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { visit: { restaurantId: 'restInB', restaurant: { roomId: ROOM_A } } },
      }),
    );
  });
});
