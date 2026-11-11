import { NotFoundException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { FcmService } from '../fcm/fcm.service';
import type { StorageService } from '../storage/storage.service';
import type { CategoriesService } from '../categories/categories.service';

const ROOM = { id: 'room1', name: '우리 맛집', inviteCode: 'abcd1234', maxMembers: 4 };

function setup() {
  const read = {
    room: { findUnique: jest.fn() },
    roomReview: { count: jest.fn() },
    roomKick: { findUnique: jest.fn().mockResolvedValue(null) },
    roomMember: {
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(1),
    },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  const write = { roomMember: { create: jest.fn() } };
  // 테스트에 필요한 메서드만 가진 가짜 Prisma — 전체 PrismaClient 타입과 겹치지 않아 never로 넘긴다
  const prisma: PrismaService = { read, write } as never;
  const service = new RoomsService(
    prisma,
    {} as FcmService,
    {} as StorageService,
    {} as CategoriesService,
  );
  return { service, read, write };
}

describe('RoomsService.getInvitePreview', () => {
  it('방 이름·방장·식당 요약만 내려주고 방 ID는 노출하지 않는다', async () => {
    const { service, read } = setup();
    read.room.findUnique.mockResolvedValue({
      name: '우리 맛집',
      maxMembers: 2,
      owner: { nickname: '형준', profileImageUrl: null, profileImageVersion: null },
      _count: { members: 2, restaurants: 5 },
      restaurants: [
        {
          name: '돈까스집',
          category: '일식',
          neighborhood: '역삼동',
          visits: [{ reviews: [{ rating: 4 }, { rating: 5 }] }, { reviews: [{ rating: 3 }] }],
        },
        { name: '가고싶은곳', category: '한식', neighborhood: '성수동', visits: [] },
      ],
    });
    read.roomReview.count.mockResolvedValue(7);

    const preview = await service.getInvitePreview('abcd1234');

    expect(preview).toEqual({
      roomName: '우리 맛집',
      owner: { nickname: '형준', profileImageUrl: null },
      memberCount: 2,
      maxMembers: 2,
      isFull: true,
      restaurantCount: 5,
      reviewCount: 7,
      recentRestaurants: [
        { name: '돈까스집', category: '일식', neighborhood: '역삼동', avgRating: 4 },
        { name: '가고싶은곳', category: '한식', neighborhood: '성수동', avgRating: null },
      ],
    });
    expect(JSON.stringify(preview)).not.toContain('room1');
  });

  it('없는 코드면 404', async () => {
    const { service, read } = setup();
    read.room.findUnique.mockResolvedValue(null);
    await expect(service.getInvitePreview('zzzz9999')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('RoomsService.join', () => {
  it('이미 멤버면 에러 없이 방을 돌려주고 멤버를 새로 만들지 않는다', async () => {
    const { service, read, write } = setup();
    read.room.findUnique.mockResolvedValue(ROOM);
    read.roomMember.findUnique.mockResolvedValue({ id: 'm1' });

    const result = await service.join('abcd1234', 'user1');

    expect(result).toMatchObject({ id: 'room1', alreadyMember: true });
    expect(write.roomMember.create).not.toHaveBeenCalled();
  });

  it('동시에 두 번 입장해 unique 위반(P2002)이 나도 에러 대신 alreadyMember=true', async () => {
    const { service, read, write } = setup();
    read.room.findUnique.mockResolvedValue(ROOM);
    write.roomMember.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));

    const result = await service.join('abcd1234', 'user1');

    expect(result).toMatchObject({ id: 'room1', alreadyMember: true });
  });

  it('새로 입장하면 멤버를 만들고 alreadyMember=false', async () => {
    const { service, read, write } = setup();
    read.room.findUnique.mockResolvedValue(ROOM);

    const result = await service.join('abcd1234', 'user1');

    expect(result).toMatchObject({ id: 'room1', alreadyMember: false });
    expect(write.roomMember.create).toHaveBeenCalledWith({
      data: { role: 'member', roomId: 'room1', userId: 'user1' },
    });
  });
});
