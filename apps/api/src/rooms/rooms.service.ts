import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../fcm/fcm.service';
import { StorageService } from '../storage/storage.service';
import { measure } from '../common/perf';

/** 평균 평점 계산 (소수점 1자리 반올림). 빈 배열이면 null 반환. */
function calcAvgRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10;
}

const MAX_ROOM_MEMBERS = 4;
const MAX_ROOMS_PER_USER = 30;
const CODE_GEN_MAX_RETRIES = 10;

/** 이미지 상대 경로에 R2_PUBLIC_URL prefix 붙이기 */
function toImageUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith('http')) return path; // 이미 절대 URL이면 그대로
  const base = (process.env.R2_PUBLIC_URL || 'https://media.musikga.kr').replace(/\/$/, '');
  return base ? `${base}/${path}` : path;
}


@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
    private readonly storageService: StorageService,
  ) {}

  private isOwnerOrManager(role: string): boolean {
    return role === 'owner' || role === 'manager';
  }

  /** 고유 8자 초대 코드 생성 */
  private async generateInviteCode(): Promise<string> {
    for (let i = 0; i < CODE_GEN_MAX_RETRIES; i++) {
      const code = randomBytes(4).toString('hex');
      const existing = await this.prisma.read.room.findUnique({ where: { inviteCode: code } });
      if (!existing) return code;
    }
    throw new ConflictException('초대 코드 생성에 실패했습니다. 다시 시도해 주세요.');
  }

  /** 방 생성 (생성자 = owner) */
  async create(name: string, ownerId: string, isPublic?: boolean) {
    const joinedCount = await measure('room.create.countRooms', () =>
      this.prisma.read.roomMember.count({ where: { userId: ownerId } }),
    );
    if (joinedCount >= MAX_ROOMS_PER_USER) {
      throw new ForbiddenException(`참여할 수 있는 방은 최대 ${MAX_ROOMS_PER_USER}개입니다.`);
    }

    const inviteCode = await this.generateInviteCode();

    return measure('room.create.transaction', () =>
      this.prisma.write.$transaction(async (tx) => {
        const room = await tx.room.create({
          data: {
            name,
            inviteCode,
            ownerId,
            ...(isPublic !== undefined && { isPublic }),
          },
        });

        await tx.roomMember.create({
          data: { role: 'owner', roomId: room.id, userId: ownerId },
        });

        return room;
      }),
    );
  }

  /** 내 방 목록 */
  async findMyRooms(userId: string) {
    // writer에서 읽어 생성/삭제 직후 재조회 시 replication lag 방지
    const memberships = await this.prisma.write.roomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            _count: { select: { members: true, restaurants: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.room,
      myRole: m.role,
      memberCount: m.room._count.members,
      restaurantCount: m.room._count.restaurants,
    }));
  }

  /** 방 상세 조회 */
  async findOne(roomId: string, _userId?: string) {
    const room = await measure('room.findOne.query', () =>
      // writer에서 읽어 수정 직후 재조회 시 replication lag 방지
      this.prisma.write.room.findUnique({
        where: { id: roomId },
        include: {
          members: {
            include: {
              user: { select: { id: true, nickname: true, profileImageUrl: true } },
            },
            orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
          },
          restaurants: {
            include: {
              addedBy: { select: { id: true, nickname: true } },
              images: { select: { url: true }, orderBy: { sortOrder: 'asc' } },
              visits: {
                include: {
                  reviews: { select: { rating: true } },
                },
              },
              _count: { select: { visits: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    );

    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');

    return {
      ...room,
      restaurants: room.restaurants.map(({ visits, images, ...rest }) => {
        const allRatings = visits.flatMap((v) => v.reviews.map((r) => r.rating));
        return {
          ...rest,
          images: images.map((img) => toImageUrl(img.url)),
          avgRating: calcAvgRating(allRatings),
          _count: { ...rest._count, reviews: allRatings.length },
        };
      }),
    };
  }

  /** 초대 코드로 입장 */
  async join(inviteCode: string, userId: string) {
    const room = await this.prisma.read.room.findUnique({ where: { inviteCode } });
    if (!room) throw new NotFoundException('유효하지 않은 초대 코드입니다');

    // 4개 검증 쿼리 병렬 실행
    const [kicked, existing, userRoomCount, memberCount] = await Promise.all([
      this.prisma.read.roomKick.findUnique({
        where: { roomId_userId: { roomId: room.id, userId } },
      }),
      this.prisma.read.roomMember.findUnique({
        where: { roomId_userId: { roomId: room.id, userId } },
      }),
      this.prisma.read.roomMember.count({ where: { userId } }),
      this.prisma.read.roomMember.count({ where: { roomId: room.id } }),
    ]);

    if (kicked) throw new ForbiddenException('이 방에서 강퇴되어 재입장할 수 없습니다.');
    if (existing) throw new ConflictException('이미 이 방에 참여하고 있습니다');
    if (userRoomCount >= MAX_ROOMS_PER_USER) {
      throw new ForbiddenException(`참여할 수 있는 방은 최대 ${MAX_ROOMS_PER_USER}개입니다.`);
    }
    if (memberCount >= MAX_ROOM_MEMBERS) {
      throw new ForbiddenException(`방 인원이 가득 찼습니다 (최대 ${MAX_ROOM_MEMBERS}명)`);
    }

    await this.prisma.write.roomMember.create({
      data: { role: 'member', roomId: room.id, userId },
    });

    // 알림: 새 멤버 참여
    const joinedUser = await this.prisma.read.user.findUnique({ where: { id: userId }, select: { nickname: true } });
    if (joinedUser) {
      this.createNotificationForRoom(room.id, userId, 'member_joined', `${joinedUser.nickname}님이 방에 참여했습니다.`).catch(() => {});
    }

    return room;
  }

  /** 방 이름 수정 (owner만) */
  async updateRoom(roomId: string, name: string, userId: string) {
    const room = await this.prisma.read.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');
    if (room.ownerId !== userId) throw new ForbiddenException('방장만 방 이름을 변경할 수 있습니다');

    return this.prisma.write.room.update({
      where: { id: roomId },
      data: { name },
    });
  }

  /** 초대 코드 재생성 (owner만) */
  async regenerateInviteCode(roomId: string, userId: string) {
    const room = await this.prisma.read.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');
    if (room.ownerId !== userId) throw new ForbiddenException('방장만 초대 코드를 재생성할 수 있습니다');

    const newCode = await this.generateInviteCode();
    return this.prisma.write.room.update({
      where: { id: roomId },
      data: { inviteCode: newCode },
      select: { inviteCode: true },
    });
  }

  /** 방 삭제 (owner만) */
  async remove(roomId: string, userId: string) {
    const room = await this.prisma.read.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');
    if (room.ownerId !== userId) throw new ForbiddenException('방장만 방을 삭제할 수 있습니다');

    return this.prisma.write.room.delete({ where: { id: roomId } });
  }

  /** 멤버 역할 변경 (owner만) */
  async updateMemberRole(roomId: string, targetUserId: string, role: string, requesterId: string) {
    const [room, member] = await Promise.all([
      this.prisma.read.room.findUnique({ where: { id: roomId } }),
      this.prisma.read.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId: targetUserId } },
      }),
    ]);
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');
    if (room.ownerId !== requesterId) throw new ForbiddenException('방장만 역할을 변경할 수 있습니다');
    if (targetUserId === requesterId) throw new ForbiddenException('본인의 역할은 변경할 수 없습니다');
    if (!member) throw new NotFoundException('해당 멤버를 찾을 수 없습니다');

    return this.prisma.write.roomMember.update({
      where: { id: member.id },
      data: { role },
    });
  }

  /** 멤버 강퇴 (owner만) */
  async kickMember(roomId: string, targetUserId: string, requesterId: string) {
    const [room, member] = await Promise.all([
      this.prisma.read.room.findUnique({ where: { id: roomId } }),
      this.prisma.read.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId: targetUserId } },
      }),
    ]);
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');
    if (room.ownerId !== requesterId) throw new ForbiddenException('방장만 멤버를 강퇴할 수 있습니다');
    if (targetUserId === requesterId) throw new ForbiddenException('본인을 강퇴할 수 없습니다');
    if (!member) throw new NotFoundException('해당 멤버를 찾을 수 없습니다');

    await this.prisma.write.$transaction(async (tx) => {
      await tx.roomMember.delete({ where: { id: member.id } });
      await tx.roomKick.upsert({
        where: { roomId_userId: { roomId, userId: targetUserId } },
        create: { roomId, userId: targetUserId },
        update: {},
      });
    });
  }

  /** 방장 위임 (owner만) */
  async transferOwnership(roomId: string, targetUserId: string, requesterId: string) {
    const room = await this.prisma.read.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');
    if (room.ownerId !== requesterId) throw new ForbiddenException('방장만 위임할 수 있습니다');
    if (targetUserId === requesterId) throw new ForbiddenException('본인에게 위임할 수 없습니다');

    const [targetMember, requesterMember] = await Promise.all([
      this.prisma.read.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId: targetUserId } },
      }),
      this.prisma.read.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId: requesterId } },
      }),
    ]);
    if (!targetMember) throw new NotFoundException('해당 멤버를 찾을 수 없습니다');
    if (!requesterMember) throw new NotFoundException('멤버를 찾을 수 없습니다');

    return this.prisma.write.$transaction([
      this.prisma.write.room.update({ where: { id: roomId }, data: { ownerId: targetUserId } }),
      this.prisma.write.roomMember.update({ where: { id: targetMember.id }, data: { role: 'owner' } }),
      this.prisma.write.roomMember.update({ where: { id: requesterMember.id }, data: { role: 'member' } }),
    ]);
  }

  /** 방 나가기 (owner는 나갈 수 없음) */
  async leave(roomId: string, userId: string) {
    const room = await this.prisma.read.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');
    if (room.ownerId === userId) throw new ForbiddenException('방장은 방을 나갈 수 없습니다. 방을 삭제하거나 방장을 위임해 주세요.');

    const member = await this.prisma.read.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) throw new NotFoundException('이 방의 멤버가 아닙니다');

    return this.prisma.write.roomMember.delete({ where: { id: member.id } });
  }

  // ─── 방 내 식당 ───

  /** 방 내 식당 목록 */
  async findRestaurants(
    roomId: string,
    userId: string | undefined,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      category?: string;
      sort?: string;
    } = {},
  ) {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { roomId };
    if (options.search) {
      where.OR = [
        { name: { contains: options.search } },
        { address: { contains: options.search } },
        { category: { contains: options.search } },
      ];
    }
    if (options.category) {
      where.category = options.category;
    }

    // DB 레벨 정렬 가능한 필드만 orderBy로 설정
    const isDbSort = !options.sort || options.sort === 'name' || options.sort === 'oldest';
    let orderBy: Record<string, string> = { createdAt: 'desc' };
    switch (options.sort) {
      case 'name': orderBy = { name: 'asc' }; break;
      case 'oldest': orderBy = { createdAt: 'asc' }; break;
    }

    // 계산 필드 정렬 시 전체 fetch 후 메모리 정렬 → 페이지네이션
    const [restaurants, total] = await measure('restaurants.list.query', () =>
      Promise.all([
        this.prisma.read.roomRestaurant.findMany({
          where,
          include: {
            addedBy: { select: { id: true, nickname: true } },
            images: { select: { url: true }, orderBy: { sortOrder: 'asc' } },
            visits: { include: { reviews: { select: { rating: true } } } },
            _count: { select: { visits: true } },
          },
          orderBy,
          ...(isDbSort ? { skip, take: pageSize } : {}),
        }),
        this.prisma.read.roomRestaurant.count({ where }),
      ]),
    );

    let data = restaurants.map(({ visits, images, ...rest }) => {
      const allRatings = visits.flatMap((v) => v.reviews.map((r) => r.rating));
      return {
        ...rest,
        images: images.map((img) => toImageUrl(img.url)),
        avgRating: calcAvgRating(allRatings),
        _count: { ...rest._count, reviews: allRatings.length },
      };
    });

    // 계산 필드 정렬: 전체 데이터에서 정렬 후 페이지네이션 적용
    if (!isDbSort) {
      switch (options.sort) {
        case 'rating-high': data.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)); break;
        case 'rating-low': data.sort((a, b) => (a.avgRating ?? 0) - (b.avgRating ?? 0)); break;
        case 'reviews': data.sort((a, b) => b._count.reviews - a._count.reviews); break;
        case 'visits': data.sort((a, b) => b._count.visits - a._count.visits); break;
      }
      data = data.slice(skip, skip + pageSize);
    }

    return { data, total, page, pageSize };
  }

  /** 방 내 식당 등록 */
  async createRestaurant(
    roomId: string,
    addedById: string,
    name: string,
    address: string,
    province: string,
    city: string,
    neighborhood: string,
    category: string,
    images?: string[],
    latitude?: number,
    longitude?: number,
  ) {
    const imageList = (images ?? []).slice(0, 3);
    const restaurant = await this.prisma.write.roomRestaurant.create({
      data: {
        roomId, addedById, name, address, province, city, neighborhood, category, latitude, longitude,
        images: imageList.length > 0 ? { create: imageList.map((url, i) => ({ url, sortOrder: i })) } : undefined,
      },
    });

    // 알림: 식당 등록
    const user = await this.prisma.read.user.findUnique({ where: { id: addedById }, select: { nickname: true } });
    if (user) {
      this.createNotificationForRoom(roomId, addedById, 'restaurant_added', `${user.nickname}님이 "${name}" 식당을 등록했습니다.`).catch(() => {});
    }

    return restaurant;
  }

  /** 방 내 식당 수정 (본인 or manager+) */
  async updateRestaurant(
    roomId: string,
    restaurantId: string,
    userId: string,
    memberRole: 'owner' | 'manager' | 'member',
    data: { name?: string; category?: string; address?: string; latitude?: number; longitude?: number; isClosed?: boolean; images?: string[] },
  ) {
    const restaurant = await this.prisma.read.roomRestaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant || restaurant.roomId !== roomId) {
      throw new NotFoundException('식당을 찾을 수 없습니다');
    }
    const isOwnerOrManager = this.isOwnerOrManager(memberRole);
    if ((!restaurant.addedById || restaurant.addedById !== userId) && !isOwnerOrManager) {
      throw new ForbiddenException('본인이 등록한 식당이거나 매니저 이상만 수정할 수 있습니다');
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.address !== undefined) {
      updateData.address = data.address;
      // 주소에서 시/도, 시/군/구, 읍/면/동 파싱
      const parts = data.address.split(' ');
      updateData.province = parts[0] || '';
      updateData.city = parts[1] || '';
      updateData.neighborhood = parts[2] || '';
    }
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.isClosed !== undefined) updateData.isClosed = data.isClosed;

    // 이미지는 트랜잭션으로 delete-all + insert 패턴
    if (data.images !== undefined) {
      const newImages = data.images.slice(0, 3);
      const result = await this.prisma.write.$transaction(async (tx) => {
        if (Object.keys(updateData).length > 0) {
          await tx.roomRestaurant.update({ where: { id: restaurantId }, data: updateData });
        }
        await tx.roomRestaurantImage.deleteMany({ where: { restaurantId } });
        if (newImages.length > 0) {
          await tx.roomRestaurantImage.createMany({
            data: newImages.map((url, i) => ({ restaurantId, url, sortOrder: i })),
          });
        }
        return tx.roomRestaurant.findUnique({
          where: { id: restaurantId },
          include: { images: { select: { url: true }, orderBy: { sortOrder: 'asc' } } },
        });
      });
      if (!result) return null;
      const { images, ...rest } = result;
      return { ...rest, images: images.map((img) => img.url) };
    }

    return this.prisma.write.roomRestaurant.update({
      where: { id: restaurantId },
      data: updateData,
    });
  }

  /** 방 내 식당 삭제 (본인 or manager+) */
  async removeRestaurant(roomId: string, restaurantId: string, userId: string, memberRole: 'owner' | 'manager' | 'member') {
    const restaurant = await this.prisma.read.roomRestaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant || restaurant.roomId !== roomId) {
      throw new NotFoundException('식당을 찾을 수 없습니다');
    }

    const isOwnerOrManager = this.isOwnerOrManager(memberRole);
    if ((!restaurant.addedById || restaurant.addedById !== userId) && !isOwnerOrManager) {
      throw new ForbiddenException('본인이 등록한 식당이거나 매니저 이상만 삭제할 수 있습니다');
    }

    return this.prisma.write.roomRestaurant.delete({ where: { id: restaurantId } });
  }

  /** 방 내 식당 상세 (방문 기록 + 리뷰 포함) */
  async findRestaurantDetail(roomId: string, restaurantId: string) {
    const restaurant = await measure('restaurant.detail.query', () =>
      // writer에서 읽어 수정 직후 재조회 시 replication lag 방지
      this.prisma.write.roomRestaurant.findUnique({
        where: { id: restaurantId },
        include: {
          addedBy: { select: { id: true, nickname: true } },
          images: { select: { url: true }, orderBy: { sortOrder: 'asc' } },
          visits: {
            include: {
              createdBy: { select: { id: true, nickname: true } },
              participants: {
                include: { user: { select: { id: true, nickname: true, profileImageUrl: true } } },
              },
              reviews: {
                include: { user: { select: { id: true, nickname: true, profileImageUrl: true } } },
                orderBy: { createdAt: 'desc' },
              },
              _count: { select: { reviews: true } },
            },
            orderBy: { visitedAt: 'desc' },
          },
        },
      }),
    );

    if (!restaurant || restaurant.roomId !== roomId) {
      throw new NotFoundException('식당을 찾을 수 없습니다');
    }

    const { images, ...rest } = restaurant;
    return { ...rest, images: images.map((img) => img.url) };
  }

  // ─── 방문 기록 ───

  /** 방문 기록 생성 */
  async createVisit(roomId: string, restaurantId: string, userId: string, visitedAt: string, memo?: string, waitTime?: string, isDelivery?: boolean, participantIds?: string[]) {
    const restaurant = await this.prisma.read.roomRestaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant || restaurant.roomId !== roomId) {
      throw new NotFoundException('식당을 찾을 수 없습니다');
    }

    const visit = await measure('visit.create.write', () =>
      this.prisma.write.roomVisit.create({
        data: {
          restaurantId,
          createdById: userId,
          visitedAt: new Date(visitedAt),
          memo,
          waitTime,
          isDelivery: isDelivery ?? false,
          participants: participantIds && participantIds.length > 0
            ? { create: participantIds.map((uid) => ({ userId: uid })) }
            : undefined,
        },
        include: {
          createdBy: { select: { id: true, nickname: true } },
          participants: {
            include: { user: { select: { id: true, nickname: true, profileImageUrl: true } } },
          },
          reviews: {
            include: { user: { select: { id: true, nickname: true, profileImageUrl: true } } },
          },
          _count: { select: { reviews: true } },
        },
      }),
    );

    // 알림: 방문 기록 추가
    if (visit.createdBy) {
      this.createNotificationForRoom(roomId, userId, 'visit_added', `${visit.createdBy.nickname}님이 "${restaurant.name}" 방문을 기록했습니다.`).catch(() => {});
    }

    return visit;
  }

  /** 방문 기록 수정 (생성자 or manager+) */
  async updateVisit(
    visitId: string,
    userId: string,
    memberRole: 'owner' | 'manager' | 'member',
    data: { visitedAt?: string; memo?: string | null; waitTime?: string | null; isDelivery?: boolean },
  ) {
    const visit = await this.prisma.read.roomVisit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException('방문 기록을 찾을 수 없습니다');

    const isOwnerOrManager = this.isOwnerOrManager(memberRole);
    if ((!visit.createdById || visit.createdById !== userId) && !isOwnerOrManager) {
      throw new ForbiddenException('본인이 생성한 방문 기록이거나 매니저 이상만 수정할 수 있습니다');
    }

    return this.prisma.write.roomVisit.update({
      where: { id: visitId },
      data: {
        ...(data.visitedAt !== undefined && { visitedAt: new Date(data.visitedAt) }),
        ...(data.memo !== undefined && { memo: data.memo }),
        ...(data.waitTime !== undefined && { waitTime: data.waitTime }),
        ...(data.isDelivery !== undefined && { isDelivery: data.isDelivery }),
      },
    });
  }

  /** 방문 기록 삭제 (생성자 or manager+) */
  async removeVisit(visitId: string, userId: string, memberRole: 'owner' | 'manager' | 'member') {
    const visit = await this.prisma.read.roomVisit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException('방문 기록을 찾을 수 없습니다');

    const isOwnerOrManager = this.isOwnerOrManager(memberRole);
    if ((!visit.createdById || visit.createdById !== userId) && !isOwnerOrManager) {
      throw new ForbiddenException('본인이 생성한 방문 기록이거나 매니저 이상만 삭제할 수 있습니다');
    }

    return this.prisma.write.roomVisit.delete({ where: { id: visitId } });
  }

  // ─── 방 내 리뷰 ───

  /** 방문 기록에 리뷰 작성 (방문당 1인 1리뷰) */
  async createReview(
    visitId: string,
    userId: string,
    rating: number,
    content?: string,
    wouldRevisit = true,
    tasteRating?: number,
    valueRating?: number,
    serviceRating?: number,
    cleanlinessRating?: number,
    accessibilityRating?: number,
    favoriteMenu?: string,
    tryNextMenu?: string,
    images?: string,
  ) {
    const [visit, existing] = await Promise.all([
      this.prisma.read.roomVisit.findUnique({
        where: { id: visitId },
        include: { restaurant: { select: { name: true, roomId: true } } },
      }),
      this.prisma.read.roomReview.findUnique({
        where: { visitId_userId: { visitId, userId } },
      }),
    ]);
    if (!visit) throw new NotFoundException('방문 기록을 찾을 수 없습니다');
    if (existing) {
      throw new ConflictException('이 방문에 이미 리뷰를 작성했습니다. 기존 리뷰를 수정해 주세요.');
    }

    const review = await measure('review.create.write', () =>
      this.prisma.write.roomReview.create({
        data: {
          visitId, userId, rating, content: content ?? '', wouldRevisit,
          tasteRating, valueRating, serviceRating, cleanlinessRating, accessibilityRating,
          favoriteMenu, tryNextMenu, images,
        },
      }),
    );

    // 알림: 리뷰 작성
    const reviewer = await this.prisma.read.user.findUnique({ where: { id: userId }, select: { nickname: true } });
    if (reviewer) {
      this.createNotificationForRoom(visit.restaurant.roomId, userId, 'review_added', `${reviewer.nickname}님이 "${visit.restaurant.name}"에 리뷰를 남겼습니다. (${rating}점)`).catch(() => {});
    }

    return review;
  }

  /** 리뷰 수정 (본인만) */
  async updateReview(
    reviewId: string,
    userId: string,
    data: {
      rating?: number;
      content?: string;
      wouldRevisit?: boolean;
      tasteRating?: number | null;
      valueRating?: number | null;
      serviceRating?: number | null;
      cleanlinessRating?: number | null;
      accessibilityRating?: number | null;
      favoriteMenu?: string | null;
      tryNextMenu?: string | null;
    },
  ) {
    const review = await this.prisma.read.roomReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('리뷰를 찾을 수 없습니다');
    if (review.userId !== userId) throw new ForbiddenException('본인의 리뷰만 수정할 수 있습니다');

    return this.prisma.write.roomReview.update({
      where: { id: reviewId },
      data: {
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.wouldRevisit !== undefined && { wouldRevisit: data.wouldRevisit }),
        ...(data.tasteRating !== undefined && { tasteRating: data.tasteRating }),
        ...(data.valueRating !== undefined && { valueRating: data.valueRating }),
        ...(data.serviceRating !== undefined && { serviceRating: data.serviceRating }),
        ...(data.cleanlinessRating !== undefined && { cleanlinessRating: data.cleanlinessRating }),
        ...(data.accessibilityRating !== undefined && { accessibilityRating: data.accessibilityRating }),
        ...(data.favoriteMenu !== undefined && { favoriteMenu: data.favoriteMenu }),
        ...(data.tryNextMenu !== undefined && { tryNextMenu: data.tryNextMenu }),
      },
    });
  }

  /** 리뷰 삭제 (본인 or manager+) — R2 이미지도 정리 */
  async removeReview(reviewId: string, userId: string, memberRole: 'owner' | 'manager' | 'member') {
    const review = await this.prisma.read.roomReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('리뷰를 찾을 수 없습니다');

    const isOwnerOrManager = this.isOwnerOrManager(memberRole);
    if (review.userId !== userId && !isOwnerOrManager) {
      throw new ForbiddenException('본인의 리뷰이거나 매니저 이상만 삭제할 수 있습니다');
    }

    // R2 이미지 정리 (fire-and-forget)
    if (review.images) {
      try {
        const urls = JSON.parse(review.images) as string[];
        for (const url of urls) {
          // URL에서 key 추출: https://pub-xxx.r2.dev/reviews/userId/xxx.webp → reviews/userId/xxx.webp
          const key = url.split('/').slice(3).join('/');
          if (key) this.storageService.deleteImage(key).catch(() => {});
        }
      } catch { /* 파싱 실패 무시 */ }
    }

    return this.prisma.write.roomReview.delete({ where: { id: reviewId } });
  }

  // ─── 공개 맛집 추천 ───

  /** 공개 맛집 추천 리스트 (비로그인 가능) */
  async getDiscoverRestaurants() {
    // 공개 방의 식당만 조회
    const publicRooms = await this.prisma.read.room.findMany({
      where: { isPublic: true },
      select: { id: true },
    });
    const publicRoomIds = publicRooms.map((r) => r.id);
    if (publicRoomIds.length === 0) return { topRated: [], topRooms: [] };

    // 1) 공개 방 고평점 식당
    const restaurants = await this.prisma.read.roomRestaurant.findMany({
      where: { roomId: { in: publicRoomIds } },
      select: {
        id: true,
        name: true,
        address: true,
        category: true,
        roomId: true,
        room: { select: { name: true } },
        _count: { select: { visits: true } },
        visits: {
          select: {
            reviews: { select: { rating: true } },
          },
        },
      },
    });

    const topRated = restaurants
      .map((r) => {
        const ratings = r.visits.flatMap((v) => v.reviews.map((rev) => rev.rating));
        const avg = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
        return {
          name: r.name,
          address: r.address,
          category: r.category,
          avgRating: avg,
          reviewCount: ratings.length,
          visitCount: r._count.visits,
          roomId: r.roomId,
          roomName: r.room.name,
        };
      })
      .filter((r) => r.reviewCount >= 1)
      .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
      .slice(0, 20);

    // 2) 공개 방 TOP (식당 수·리뷰 수 기준)
    const roomStats = await this.prisma.read.room.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        name: true,
        _count: { select: { restaurants: true, members: true } },
      },
    });

    const topRooms = roomStats
      .map((r) => ({ id: r.id, name: r.name, restaurantCount: r._count.restaurants, memberCount: r._count.members }))
      .filter((r) => r.restaurantCount > 0)
      .sort((a, b) => b.restaurantCount - a.restaurantCount)
      .slice(0, 10);

    return { topRated, topRooms };
  }

  // ──────────────── 투표 ────────────────

  /** 투표 생성 */
  async createPoll(roomId: string, userId: string, title: string, options: { label: string; restaurantId?: string }[], endsAt?: string) {
    return this.prisma.write.$transaction(async (tx) => {
      const poll = await tx.roomPoll.create({
        data: {
          title,
          roomId,
          createdById: userId,
          endsAt: endsAt ? new Date(endsAt) : null,
          options: {
            create: options.map((o) => ({
              label: o.label,
              restaurantId: o.restaurantId || null,
            })),
          },
        },
        include: { options: { include: { votes: true } } },
      });

      // 방 멤버에게 알림 생성 (생성자 제외)
      const members = await tx.roomMember.findMany({ where: { roomId }, select: { userId: true } });
      const notifications = members
        .filter((m) => m.userId !== userId)
        .map((m) => ({ roomId, userId: m.userId, type: 'poll_created', message: `새 투표: ${title}` }));
      if (notifications.length > 0) {
        await tx.roomNotification.createMany({ data: notifications });
      }

      return poll;
    });
  }

  /** 투표 목록 조회 */
  async getPolls(roomId: string) {
    // 만료된 투표 자동 마감
    await this.prisma.write.roomPoll.updateMany({
      where: { roomId, status: 'active', endsAt: { lte: new Date() } },
      data: { status: 'closed' },
    });

    return this.prisma.read.roomPoll.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, nickname: true } },
        options: {
          include: {
            votes: { include: { user: { select: { id: true, nickname: true } } } },
            restaurant: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /** 투표 참여 (선택지에 투표) */
  async votePoll(pollId: string, optionId: string, userId: string) {
    const poll = await this.prisma.read.roomPoll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });
    if (!poll) throw new NotFoundException('투표를 찾을 수 없습니다.');
    if (poll.status !== 'active') throw new ForbiddenException('이미 마감된 투표입니다.');

    const option = poll.options.find((o) => o.id === optionId);
    if (!option) throw new NotFoundException('선택지를 찾을 수 없습니다.');

    // 이 투표에서 기존 투표 삭제 후 새로 투표 (변경 가능)
    const allOptionIds = poll.options.map((o) => o.id);
    await this.prisma.write.$transaction(async (tx) => {
      await tx.roomPollVote.deleteMany({
        where: { optionId: { in: allOptionIds }, userId },
      });
      await tx.roomPollVote.create({
        data: { optionId, userId },
      });
    });

    return { success: true };
  }

  /** 투표 마감 */
  async closePoll(pollId: string, userId: string) {
    const poll = await this.prisma.read.roomPoll.findUnique({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('투표를 찾을 수 없습니다.');
    if (poll.createdById !== userId) throw new ForbiddenException('투표 생성자만 마감할 수 있습니다.');

    await this.prisma.write.roomPoll.update({
      where: { id: pollId },
      data: { status: 'closed' },
    });
    return { success: true };
  }

  // ──────────────── 타임라인 ────────────────

  /** 방 활동 타임라인 */
  async getTimeline(roomId: string) {
    const [restaurants, visits, reviews, members] = await Promise.all([
      this.prisma.read.roomRestaurant.findMany({
        where: { roomId },
        select: { id: true, name: true, createdAt: true, addedBy: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.read.roomVisit.findMany({
        where: { restaurant: { roomId } },
        select: { id: true, visitedAt: true, createdAt: true, restaurant: { select: { id: true, name: true } }, createdBy: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.read.roomReview.findMany({
        where: { visit: { restaurant: { roomId } } },
        select: { id: true, rating: true, content: true, createdAt: true, visit: { select: { restaurant: { select: { id: true, name: true } } } }, user: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.read.roomMember.findMany({
        where: { roomId },
        select: { id: true, joinedAt: true, user: { select: { id: true, nickname: true } } },
        orderBy: { joinedAt: 'desc' },
        take: 20,
      }),
    ]);

    const timeline = [
      ...restaurants.map((r) => ({ type: 'restaurant_added' as const, date: r.createdAt, data: { restaurantId: r.id, restaurantName: r.name, user: r.addedBy } })),
      ...visits.map((v) => ({ type: 'visit_added' as const, date: v.createdAt, data: { restaurantId: v.restaurant.id, restaurantName: v.restaurant.name, visitedAt: v.visitedAt, user: v.createdBy } })),
      ...reviews.map((r) => ({ type: 'review_added' as const, date: r.createdAt, data: { restaurantId: r.visit.restaurant.id, restaurantName: r.visit.restaurant.name, rating: r.rating, content: r.content?.slice(0, 50) ?? '', user: r.user } })),
      ...members.map((m) => ({ type: 'member_joined' as const, date: m.joinedAt, data: { user: m.user } })),
    ];

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return timeline.slice(0, 50);
  }

  // ──────────────── 알림 ────────────────

  /** 내 알림 목록 */
  async getNotifications(userId: string) {
    return this.prisma.read.roomNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { room: { select: { id: true, name: true } } },
    });
  }

  /** 알림 읽음 처리 */
  async markNotificationsRead(userId: string) {
    await this.prisma.write.roomNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  /** 안 읽은 알림 수 */
  async getUnreadNotificationCount(userId: string) {
    const count = await this.prisma.read.roomNotification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  /** 알림 생성 헬퍼 (방 멤버 전체에게, 본인 제외). members를 전달하면 DB 조회 생략 */
  async createNotificationForRoom(
    roomId: string, excludeUserId: string, type: string, message: string,
    members?: { userId: string }[],
  ) {
    const memberList = members ?? await this.prisma.read.roomMember.findMany({ where: { roomId }, select: { userId: true } });
    const recipients = memberList.filter((m) => m.userId !== excludeUserId);
    const data = recipients.map((m) => ({ roomId, userId: m.userId, type, message }));
    if (data.length > 0) {
      await this.prisma.write.roomNotification.createMany({ data });

      // FCM 푸시 발송 (fire-and-forget)
      const room = await this.prisma.read.room.findUnique({ where: { id: roomId }, select: { name: true } });
      this.fcmService.sendToUsers(
        recipients.map((m) => m.userId),
        room?.name ?? '무모한 시식가',
        message,
        { roomId, link: `/room?id=${roomId}` },
      ).catch(() => {});
    }
  }

  // ──────────────── 리뷰 비교 ────────────────

  /** 같은 식당에 대한 멤버별 리뷰 비교 */
  async compareReviews(restaurantId: string) {
    const [restaurant, reviews] = await Promise.all([
      this.prisma.read.roomRestaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true, name: true, roomId: true },
      }),
      this.prisma.read.roomReview.findMany({
        where: { visit: { restaurantId } },
        include: {
          user: { select: { id: true, nickname: true } },
          visit: { select: { visitedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    if (!restaurant) throw new NotFoundException('식당을 찾을 수 없습니다.');

    // 유저별로 그룹핑
    const byUser = new Map<string, { user: { id: string; nickname: string }; reviews: typeof reviews }>();
    for (const review of reviews) {
      const key = review.user.id;
      if (!byUser.has(key)) {
        byUser.set(key, { user: review.user, reviews: [] });
      }
      byUser.get(key)!.reviews.push(review);
    }

    const comparisons = Array.from(byUser.values()).map((entry) => {
      const ratings = entry.reviews.map((r) => r.rating);
      return {
        user: entry.user,
        reviewCount: entry.reviews.length,
        avgRating: calcAvgRating(ratings),
        latestReview: entry.reviews[0] ? {
          rating: entry.reviews[0].rating,
          content: entry.reviews[0].content,
          visitedAt: entry.reviews[0].visit.visitedAt,
          tasteRating: entry.reviews[0].tasteRating,
          valueRating: entry.reviews[0].valueRating,
          serviceRating: entry.reviews[0].serviceRating,
          cleanlinessRating: entry.reviews[0].cleanlinessRating,
          accessibilityRating: entry.reviews[0].accessibilityRating,
          wouldRevisit: entry.reviews[0].wouldRevisit,
        } : null,
      };
    });

    return { restaurant, comparisons };
  }

  // ──────────────── 공개 방 ────────────────

  /** 공개 여부 토글 (owner만) */
  async togglePublic(roomId: string, userId: string, isPublic: boolean) {
    const room = await this.prisma.read.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');
    if (room.ownerId !== userId) throw new ForbiddenException('방장만 공개 설정을 변경할 수 있습니다');

    return this.prisma.write.room.update({
      where: { id: roomId },
      data: { isPublic },
      select: { id: true, isPublic: true },
    });
  }

  /** 공개 방 목록 (비로그인 가능, 품질 필터 적용) */
  async findPublicRooms(page: number, pageSize: number) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const rooms = await this.prisma.read.room.findMany({
      where: {
        isPublic: true,
        updatedAt: { gte: ninetyDaysAgo },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        restaurants: {
          select: {
            id: true,
            category: true,
            visits: {
              select: {
                reviews: { select: { rating: true } },
              },
            },
          },
        },
        _count: { select: { members: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 품질 필터: 식당 3개 이상 AND 리뷰 3개 이상
    const filtered = rooms
      .map((room) => {
        const restaurantCount = room.restaurants.length;
        const allRatings = room.restaurants.flatMap((r) =>
          r.visits.flatMap((v) => v.reviews.map((rev) => rev.rating)),
        );
        const reviewCount = allRatings.length;

        if (restaurantCount < 3 || reviewCount < 3) return null;

        // 카테고리 빈도 상위 3개
        const categoryMap = new Map<string, number>();
        for (const r of room.restaurants) {
          if (r.category) {
            categoryMap.set(r.category, (categoryMap.get(r.category) ?? 0) + 1);
          }
        }
        const topCategories = Array.from(categoryMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat]) => cat);

        return {
          id: room.id,
          name: room.name,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          memberCount: room._count.members,
          restaurantCount,
          reviewCount,
          avgRating: calcAvgRating(allRatings),
          topCategories,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const total = filtered.length;
    const skip = (page - 1) * pageSize;
    const data = filtered.slice(skip, skip + pageSize);

    return { data, total, page, pageSize };
  }

  /** 공개 방 상세 (비로그인 가능, 멤버 정보 미포함) */
  async findPublicRoomDetail(roomId: string) {
    const room = await this.prisma.read.room.findFirst({
      where: { id: roomId, isPublic: true },
      select: {
        id: true,
        name: true,
        restaurants: {
          select: {
            id: true,
            name: true,
            address: true,
            province: true,
            city: true,
            neighborhood: true,
            category: true,
            images: { select: { url: true }, orderBy: { sortOrder: 'asc' } },
            latitude: true,
            longitude: true,
            visits: {
              select: { reviews: { select: { id: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!room) throw new NotFoundException('공개 방을 찾을 수 없습니다');

    return {
      ...room,
      restaurants: room.restaurants.map(({ visits, images, ...r }) => ({
        ...r,
        images: images.map((img) => toImageUrl(img.url)),
        reviewCount: visits.reduce((sum, v) => sum + v.reviews.length, 0),
      })),
    };
  }

  /** 공개 방 식당 상세 (비로그인 가능, 유저 정보 미포함) */
  async findPublicRoomRestaurantDetail(roomId: string, restaurantId: string) {
    const room = await this.prisma.read.room.findFirst({
      where: { id: roomId, isPublic: true },
      select: { id: true },
    });
    if (!room) throw new NotFoundException('공개 방을 찾을 수 없습니다');

    const restaurant = await this.prisma.read.roomRestaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        address: true,
        province: true,
        city: true,
        neighborhood: true,
        category: true,
        images: { select: { url: true }, orderBy: { sortOrder: 'asc' } },
        latitude: true,
        longitude: true,
        roomId: true,
        visits: {
          select: {
            id: true,
            visitedAt: true,
            memo: true,
            reviews: {
              select: {
                id: true, rating: true, content: true, wouldRevisit: true,
                tasteRating: true, valueRating: true, serviceRating: true,
                cleanlinessRating: true, accessibilityRating: true,
                favoriteMenu: true, tryNextMenu: true, createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { visitedAt: 'desc' },
        },
      },
    });

    if (!restaurant || restaurant.roomId !== room.id) {
      throw new NotFoundException('식당을 찾을 수 없습니다');
    }

    const allReviews = restaurant.visits.flatMap((v) => v.reviews);
    return {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      province: restaurant.province,
      city: restaurant.city,
      neighborhood: restaurant.neighborhood,
      category: restaurant.category,
      images: restaurant.images.map((img) => toImageUrl(img.url)),
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      reviewCount: allReviews.length,
      visits: restaurant.visits,
    };
  }

  /** 공개 방 ID 목록 (sitemap용, 품질 필터 적용) */
  async findPublicRoomIds(): Promise<string[]> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const rooms = await this.prisma.read.room.findMany({
      where: {
        isPublic: true,
        updatedAt: { gte: ninetyDaysAgo },
      },
      select: {
        id: true,
        _count: { select: { restaurants: true } },
        restaurants: {
          select: {
            visits: {
              select: {
                _count: { select: { reviews: true } },
              },
            },
          },
        },
      },
    });

    return rooms
      .filter((room) => {
        const restaurantCount = room._count.restaurants;
        const reviewCount = room.restaurants.reduce(
          (sum, r) => sum + r.visits.reduce((vSum, v) => vSum + v._count.reviews, 0),
          0,
        );
        return restaurantCount >= 3 && reviewCount >= 3;
      })
      .map((room) => room.id);
  }
}
