import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/** 평균 평점 계산 (소수점 1자리 반올림). 빈 배열이면 null 반환. */
function calcAvgRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10;
}

const MAX_ROOM_MEMBERS = 4;
const MAX_ROOMS_PER_USER = 30;
const CODE_GEN_MAX_RETRIES = 10;
const INVITE_CODE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24시간
const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private isOwnerOrManager(role: string): boolean {
    return role === 'owner' || role === 'manager';
  }

  /** 플랫폼 공개 통계 (비로그인 가능) */
  async getPlatformStats() {
    const [roomCount, userCount, restaurantCount, reviewCount] = await Promise.all([
      this.prisma.read.room.count(),
      this.prisma.read.user.count(),
      this.prisma.read.roomRestaurant.count(),
      this.prisma.read.roomReview.count(),
    ]);
    return { roomCount, userCount, restaurantCount, reviewCount };
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
  async create(name: string, ownerId: string) {
    const joinedCount = await this.prisma.read.roomMember.count({ where: { userId: ownerId } });
    if (joinedCount >= MAX_ROOMS_PER_USER) {
      throw new ForbiddenException(`참여할 수 있는 방은 최대 ${MAX_ROOMS_PER_USER}개입니다.`);
    }

    const inviteCode = await this.generateInviteCode();

    return this.prisma.write.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          name,
          inviteCode,
          inviteCodeExpiresAt: new Date(Date.now() + INVITE_CODE_EXPIRY_MS),
          ownerId,
        },
      });

      await tx.roomMember.create({
        data: { role: 'owner', roomId: room.id, userId: ownerId },
      });

      return room;
    });
  }

  /** 내 방 목록 */
  async findMyRooms(userId: string) {
    const memberships = await this.prisma.read.roomMember.findMany({
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
  async findOne(roomId: string, userId?: string) {
    const room = await this.prisma.read.room.findUnique({
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
    });

    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');

    const restaurantIds = room.restaurants.map((r) => r.id);

    const wishlistedSet = new Set<string>();
    if (userId) {
      const wishlists = await this.prisma.read.roomWishlist.findMany({
        where: { userId, roomRestaurantId: { in: restaurantIds } },
        select: { roomRestaurantId: true },
      });
      for (const w of wishlists) wishlistedSet.add(w.roomRestaurantId);
    }

    // 방 전체 찜 수 집계
    const wishlistCounts = await this.prisma.read.roomWishlist.groupBy({
      by: ['roomRestaurantId'],
      where: { roomRestaurantId: { in: restaurantIds } },
      _count: true,
    });
    const wishCountMap = new Map<string, number>();
    for (const wc of wishlistCounts) {
      wishCountMap.set(wc.roomRestaurantId, wc._count);
    }

    return {
      ...room,
      restaurants: room.restaurants.map(({ visits, ...rest }) => {
        const allRatings = visits.flatMap((v) => v.reviews.map((r) => r.rating));
        return {
          ...rest,
          avgRating: calcAvgRating(allRatings),
          wishlisted: wishlistedSet.has(rest.id),
          wishlistCount: wishCountMap.get(rest.id) ?? 0,
          _count: { ...rest._count, reviews: allRatings.length },
        };
      }),
    };
  }

  /** 초대 코드로 입장 */
  async join(inviteCode: string, userId: string) {
    const room = await this.prisma.read.room.findUnique({ where: { inviteCode } });
    if (!room) throw new NotFoundException('유효하지 않은 초대 코드입니다');

    if (room.inviteCodeExpiresAt && room.inviteCodeExpiresAt < new Date()) {
      throw new ForbiddenException('초대 코드가 만료되었습니다. 방장에게 새 코드를 요청하세요.');
    }

    const kicked = await this.prisma.read.roomKick.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
    });
    if (kicked) throw new ForbiddenException('이 방에서 강퇴되어 재입장할 수 없습니다.');

    const existing = await this.prisma.read.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
    });
    if (existing) throw new ConflictException('이미 이 방에 참여하고 있습니다');

    const userRoomCount = await this.prisma.read.roomMember.count({ where: { userId } });
    if (userRoomCount >= MAX_ROOMS_PER_USER) {
      throw new ForbiddenException(`참여할 수 있는 방은 최대 ${MAX_ROOMS_PER_USER}개입니다.`);
    }

    const memberCount = await this.prisma.read.roomMember.count({
      where: { roomId: room.id },
    });
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
      data: {
        inviteCode: newCode,
        inviteCodeExpiresAt: new Date(Date.now() + INVITE_CODE_EXPIRY_MS),
      },
      select: { inviteCode: true, inviteCodeExpiresAt: true },
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
    const room = await this.prisma.read.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');
    if (room.ownerId !== requesterId) throw new ForbiddenException('방장만 역할을 변경할 수 있습니다');
    if (targetUserId === requesterId) throw new ForbiddenException('본인의 역할은 변경할 수 없습니다');

    const member = await this.prisma.read.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });
    if (!member) throw new NotFoundException('해당 멤버를 찾을 수 없습니다');

    return this.prisma.write.roomMember.update({
      where: { id: member.id },
      data: { role },
    });
  }

  /** 멤버 강퇴 (owner만) */
  async kickMember(roomId: string, targetUserId: string, requesterId: string) {
    const room = await this.prisma.read.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');
    if (room.ownerId !== requesterId) throw new ForbiddenException('방장만 멤버를 강퇴할 수 있습니다');
    if (targetUserId === requesterId) throw new ForbiddenException('본인을 강퇴할 수 없습니다');

    const member = await this.prisma.read.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });
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

    const targetMember = await this.prisma.read.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });
    if (!targetMember) throw new NotFoundException('해당 멤버를 찾을 수 없습니다');

    const requesterMember = await this.prisma.read.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: requesterId } },
    });
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

  // ─── 공유 코드 ───

  /** 고유 8자 공유 코드 생성 */
  private async generateShareCode(): Promise<string> {
    for (let i = 0; i < CODE_GEN_MAX_RETRIES; i++) {
      const code = randomBytes(4).toString('hex');
      const existing = await this.prisma.read.room.findFirst({ where: { shareCode: code } });
      if (!existing) return code;
    }
    throw new ConflictException('공유 코드 생성에 실패했습니다. 다시 시도해 주세요.');
  }

  /** 공유 코드 활성화/비활성화/재생성 (owner + manager) */
  async toggleShareCode(roomId: string, requesterId: string, action: 'enable' | 'disable' | 'regenerate') {
    const room = await this.prisma.read.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');

    const member = await this.prisma.read.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: requesterId } },
    });
    if (!member || (member.role !== 'owner' && member.role !== 'manager')) {
      throw new ForbiddenException('매니저 이상의 권한이 필요합니다');
    }

    if (action === 'disable') {
      return this.prisma.write.room.update({
        where: { id: roomId },
        data: { shareCodeEnabled: false },
        select: { shareCode: true, shareCodeEnabled: true },
      });
    }

    const shareCode = action === 'regenerate' || !room.shareCode
      ? await this.generateShareCode()
      : room.shareCode;

    return this.prisma.write.room.update({
      where: { id: roomId },
      data: { shareCode, shareCodeEnabled: true },
      select: { shareCode: true, shareCodeEnabled: true },
    });
  }

  /** 공유 코드로 방 조회 (비로그인 공개) */
  async findByShareCode(shareCode: string) {
    const room = await this.prisma.read.room.findFirst({
      where: { shareCode, shareCodeEnabled: true },
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
            imageUrl: true,
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

    if (!room) throw new NotFoundException('유효하지 않은 공유 링크입니다');

    return {
      ...room,
      restaurants: room.restaurants.map(({ visits, ...r }) => ({
        ...r,
        reviewCount: visits.reduce((sum, v) => sum + v.reviews.length, 0),
      })),
    };
  }

  /** 공유 코드로 식당 상세 조회 (비로그인 공개) */
  async findSharedRestaurantDetail(shareCode: string, restaurantId: string) {
    const room = await this.prisma.read.room.findFirst({
      where: { shareCode, shareCodeEnabled: true },
      select: { id: true },
    });
    if (!room) throw new NotFoundException('유효하지 않은 공유 링크입니다');

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
        imageUrl: true,
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
      imageUrl: restaurant.imageUrl,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      reviewCount: allReviews.length,
      visits: restaurant.visits,
    };
  }

  // ─── 방 내 식당 ───

  /** 방 내 식당 목록 */
  async findRestaurants(roomId: string) {
    return this.prisma.read.roomRestaurant.findMany({
      where: { roomId },
      include: {
        addedBy: { select: { id: true, nickname: true } },
        _count: { select: { visits: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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
    imageUrl?: string,
    latitude?: number,
    longitude?: number,
  ) {
    const restaurant = await this.prisma.write.roomRestaurant.create({
      data: { roomId, addedById, name, address, province, city, neighborhood, category, imageUrl, latitude, longitude },
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
    data: { name?: string; category?: string; address?: string; latitude?: number; longitude?: number; isClosed?: boolean },
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
    const restaurant = await this.prisma.read.roomRestaurant.findUnique({
      where: { id: restaurantId },
      include: {
        addedBy: { select: { id: true, nickname: true } },
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
    });

    if (!restaurant || restaurant.roomId !== roomId) {
      throw new NotFoundException('식당을 찾을 수 없습니다');
    }

    return restaurant;
  }

  // ─── 방문 기록 ───

  /** 방문 기록 생성 */
  async createVisit(roomId: string, restaurantId: string, userId: string, visitedAt: string, memo?: string, waitTime?: string, participantIds?: string[]) {
    const restaurant = await this.prisma.read.roomRestaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant || restaurant.roomId !== roomId) {
      throw new NotFoundException('식당을 찾을 수 없습니다');
    }

    const visit = await this.prisma.write.roomVisit.create({
      data: {
        restaurantId,
        createdById: userId,
        visitedAt: new Date(visitedAt),
        memo,
        waitTime,
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
    });

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
    data: { visitedAt?: string; memo?: string | null; waitTime?: string | null },
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
    content: string,
    wouldRevisit = true,
    tasteRating?: number,
    valueRating?: number,
    serviceRating?: number,
    cleanlinessRating?: number,
    accessibilityRating?: number,
    favoriteMenu?: string,
    tryNextMenu?: string,
  ) {
    const visit = await this.prisma.read.roomVisit.findUnique({
      where: { id: visitId },
      include: { restaurant: { select: { name: true, roomId: true } } },
    });
    if (!visit) throw new NotFoundException('방문 기록을 찾을 수 없습니다');

    const existing = await this.prisma.read.roomReview.findUnique({
      where: { visitId_userId: { visitId, userId } },
    });
    if (existing) {
      throw new ConflictException('이 방문에 이미 리뷰를 작성했습니다. 기존 리뷰를 수정해 주세요.');
    }

    const review = await this.prisma.write.roomReview.create({
      data: {
        visitId, userId, rating, content, wouldRevisit,
        tasteRating, valueRating, serviceRating, cleanlinessRating, accessibilityRating,
        favoriteMenu, tryNextMenu,
      },
    });

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

  /** 리뷰 삭제 (본인 or manager+) */
  async removeReview(reviewId: string, userId: string, memberRole: 'owner' | 'manager' | 'member') {
    const review = await this.prisma.read.roomReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('리뷰를 찾을 수 없습니다');

    const isOwnerOrManager = this.isOwnerOrManager(memberRole);
    if (review.userId !== userId && !isOwnerOrManager) {
      throw new ForbiddenException('본인의 리뷰이거나 매니저 이상만 삭제할 수 있습니다');
    }

    return this.prisma.write.roomReview.delete({ where: { id: reviewId } });
  }

  // ─── 통계 ───

  /** 방 전체 통계 조회 */
  async getRoomStats(roomId: string, userId: string) {
    const room = await this.prisma.read.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: { select: { id: true, nickname: true, profileImageUrl: true } } },
        },
        restaurants: {
          select: {
            id: true, name: true, category: true, province: true, city: true, neighborhood: true,
            visits: {
              select: {
                id: true, visitedAt: true, waitTime: true, createdById: true,
                participants: { select: { userId: true } },
                reviews: {
                  select: {
                    id: true, rating: true, wouldRevisit: true, userId: true,
                    tasteRating: true, valueRating: true, serviceRating: true,
                    cleanlinessRating: true, accessibilityRating: true,
                    favoriteMenu: true, tryNextMenu: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');

    const allVisits = room.restaurants.flatMap((r) => r.visits.map((v) => ({ ...v, restaurantName: r.name, restaurantId: r.id })));
    const allReviews = allVisits.flatMap((v) => v.reviews);

    // ─── 기본 요약 ───
    const totalRestaurants = room.restaurants.length;
    const totalVisits = allVisits.length;
    const totalReviews = allReviews.length;
    const overallAvg = calcAvgRating(allReviews.map((r) => r.rating));

    // ─── 멤버별 통계 ───
    const memberMap = new Map<string, { nickname: string; reviews: typeof allReviews; visitCount: number }>();
    for (const m of room.members) {
      memberMap.set(m.userId, { nickname: m.user.nickname, reviews: [], visitCount: 0 });
    }
    for (const review of allReviews) {
      const entry = memberMap.get(review.userId);
      if (entry) entry.reviews.push(review);
    }
    for (const visit of allVisits) {
      // 생성자
      if (visit.createdById) {
        const entry = memberMap.get(visit.createdById);
        if (entry) entry.visitCount++;
      }
      // 참여자
      for (const p of visit.participants) {
        const entry = memberMap.get(p.userId);
        if (entry && p.userId !== visit.createdById) entry.visitCount++;
      }
    }

    const memberStats = Array.from(memberMap.entries())
      .map(([uid, data]) => {
        const avg = calcAvgRating(data.reviews.map((r) => r.rating));
        // 실제 재방문율: 이 멤버가 방문한 식당 중 2회 이상 방문한 식당 비율
        const visitedRestMap = new Map<string, number>();
        for (const rest of room.restaurants) {
          for (const visit of rest.visits) {
            const isParticipant = visit.createdById === uid || visit.participants.some((p) => p.userId === uid);
            if (isParticipant) {
              visitedRestMap.set(rest.id, (visitedRestMap.get(rest.id) || 0) + 1);
            }
          }
        }
        const totalVisitedRests = visitedRestMap.size;
        const revisitedRests = Array.from(visitedRestMap.values()).filter((c) => c >= 2).length;
        const revisitRate = totalVisitedRests > 0
          ? Math.round(revisitedRests / totalVisitedRests * 100)
          : null;
        return {
          userId: uid,
          nickname: data.nickname,
          reviewCount: data.reviews.length,
          visitCount: data.visitCount,
          avgRating: avg,
          revisitRate,
        };
      })
      .sort((a, b) => b.reviewCount - a.reviewCount);

    // ─── 카테고리별 통계 ───
    const catMap = new Map<string, { count: number; ratings: number[] }>();
    for (const r of room.restaurants) {
      const ratings = r.visits.flatMap((v) => v.reviews.map((rev) => rev.rating));
      const entry = catMap.get(r.category);
      if (entry) { entry.count++; entry.ratings.push(...ratings); }
      else catMap.set(r.category, { count: 1, ratings });
    }
    const categoryStats = Array.from(catMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        avgRating: calcAvgRating(data.ratings),
      }))
      .sort((a, b) => b.count - a.count);

    // ─── 지역별 통계 ───
    const regionMap = new Map<string, { count: number; ratings: number[] }>();
    for (const r of room.restaurants) {
      const key = r.neighborhood || r.city;
      const ratings = r.visits.flatMap((v) => v.reviews.map((rev) => rev.rating));
      const entry = regionMap.get(key);
      if (entry) { entry.count++; entry.ratings.push(...ratings); }
      else regionMap.set(key, { count: 1, ratings });
    }
    const regionStats = Array.from(regionMap.entries())
      .map(([region, data]) => ({
        region,
        count: data.count,
        avgRating: calcAvgRating(data.ratings),
      }))
      .sort((a, b) => b.count - a.count);

    // ─── 세부 평점 평균 (레이더 차트용) ───
    const detailFields = ['tasteRating', 'valueRating', 'serviceRating', 'cleanlinessRating', 'accessibilityRating'] as const;
    const detailRatingAvg: Record<string, number | null> = {};
    for (const field of detailFields) {
      const vals = allReviews.map((r) => r[field]).filter((v): v is number => v !== null);
      detailRatingAvg[field] = calcAvgRating(vals);
    }

    // ─── 월별 방문 트렌드 ───
    const monthMap = new Map<string, number>();
    for (const v of allVisits) {
      const month = new Date(v.visitedAt).toISOString().slice(0, 7);
      monthMap.set(month, (monthMap.get(month) || 0) + 1);
    }
    const monthlyVisits = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // ─── 요일별 방문 분포 ───
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // 일~토
    for (const v of allVisits) {
      const day = new Date(v.visitedAt).getDay();
      dayOfWeekCounts[day]++;
    }

    // ─── 웨이팅 분포 ───
    const waitTimeMap = new Map<string, number>();
    for (const v of allVisits) {
      if (v.waitTime) {
        waitTimeMap.set(v.waitTime, (waitTimeMap.get(v.waitTime) || 0) + 1);
      }
    }
    const waitTimeStats = Array.from(waitTimeMap.entries())
      .map(([waitTime, count]) => ({ waitTime, count }))
      .sort((a, b) => b.count - a.count);

    // ─── 인기 메뉴 ───
    const favMenuMap = new Map<string, number>();
    const tryMenuMap = new Map<string, number>();
    for (const r of allReviews) {
      if (r.favoriteMenu) favMenuMap.set(r.favoriteMenu, (favMenuMap.get(r.favoriteMenu) || 0) + 1);
      if (r.tryNextMenu) tryMenuMap.set(r.tryNextMenu, (tryMenuMap.get(r.tryNextMenu) || 0) + 1);
    }
    const topFavoriteMenus = Array.from(favMenuMap.entries())
      .map(([menu, count]) => ({ menu, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const topTryNextMenus = Array.from(tryMenuMap.entries())
      .map(([menu, count]) => ({ menu, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ─── 재방문 TOP 식당 (실제 방문 2회 이상) ───
    const topRevisitRestaurants = room.restaurants
      .map((r) => ({ name: r.name, visitCount: r.visits.length }))
      .filter((r) => r.visitCount >= 2)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5);

    // ─── 식당별 평균 평점 TOP/BOTTOM ───
    const restaurantRatings = room.restaurants
      .map((r) => {
        const ratings = r.visits.flatMap((v) => v.reviews.map((rev) => rev.rating));
        return {
          name: r.name,
          avgRating: calcAvgRating(ratings),
          reviewCount: ratings.length,
        };
      })
      .filter((r) => r.avgRating !== null && r.reviewCount >= 1);

    const topRatedRestaurants = [...restaurantRatings].sort((a, b) => b.avgRating! - a.avgRating!).slice(0, 5);
    const bottomRatedRestaurants = [...restaurantRatings].sort((a, b) => a.avgRating! - b.avgRating!).slice(0, 5);

    // ─── 리뷰 안 쓴 방문 (현재 유저) ───
    const unreviewedVisits = allVisits
      .filter((v) => {
        const isParticipant = v.createdById === userId || v.participants.some((p) => p.userId === userId);
        const hasMyReview = v.reviews.some((r) => r.userId === userId);
        return isParticipant && !hasMyReview;
      })
      .map((v) => ({ visitId: v.id, restaurantName: v.restaurantName, visitedAt: v.visitedAt }))
      .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
      .slice(0, 10);

    // ─── 멤버 행동 분석 ───
    const { memberBehaviors, bestCombos } = this.analyzeMemberBehaviors(room.restaurants, allVisits, memberMap);

    // ─── 방 행동 분석 ───
    const { activityTrend, ratingInflation, staleRestaurants, diversityIndex, waitTolerance, peakMonth } =
      this.analyzeRoomBehaviors(room.restaurants, allVisits, catMap, monthlyVisits);

    return {
      summary: { totalRestaurants, totalVisits, totalReviews, overallAvg },
      memberStats,
      categoryStats,
      regionStats,
      detailRatingAvg,
      monthlyVisits,
      dayOfWeekVisits: dayOfWeekCounts,
      waitTimeStats,
      topFavoriteMenus,
      topTryNextMenus,
      topRevisitRestaurants,
      topRatedRestaurants,
      bottomRatedRestaurants,
      unreviewedVisits,
      // 행동 분석
      memberBehaviors,
      bestCombos,
      activityTrend,
      ratingInflation,
      staleRestaurants,
      diversityIndex,
      waitTolerance,
      peakMonth,
    };
  }

  // ─── 통계 헬퍼 ───

  private analyzeMemberBehaviors(
    restaurants: { id: string; category: string; visits: { visitedAt: Date; createdById: string | null; participants: { userId: string }[]; reviews: { rating: number; userId: string; tasteRating: number | null; valueRating: number | null; serviceRating: number | null; cleanlinessRating: number | null; accessibilityRating: number | null }[] }[] }[],
    allVisits: { createdById: string | null; participants: { userId: string }[] }[],
    memberMap: Map<string, { nickname: string; reviews: { rating: number; tasteRating: number | null; valueRating: number | null; serviceRating: number | null; cleanlinessRating: number | null; accessibilityRating: number | null }[] }>,
  ) {
    const memberBehaviors = Array.from(memberMap.entries()).map(([uid, data]) => {
      // 식당별 방문 횟수 + 카테고리 + 요일 — 한 번의 루프로 집계
      const restVisitMap = new Map<string, number>();
      const catCounts = new Map<string, number>();
      let memberVisitCount = 0;
      let weekdayCount = 0;
      let weekendCount = 0;

      for (const rest of restaurants) {
        for (const visit of rest.visits) {
          const isParticipant = visit.createdById === uid || visit.participants.some((p) => p.userId === uid);
          if (!isParticipant) continue;
          memberVisitCount++;
          restVisitMap.set(rest.id, (restVisitMap.get(rest.id) || 0) + 1);
          catCounts.set(rest.category, (catCounts.get(rest.category) || 0) + 1);
          const day = new Date(visit.visitedAt).getDay();
          if (day === 0 || day === 6) weekendCount++;
          else weekdayCount++;
        }
      }

      // 탐험가 vs 단골러
      const totalRests = restVisitMap.size;
      const revisitedRests = Array.from(restVisitMap.values()).filter((c) => c >= 2).length;
      const explorerRate = totalRests > 0 ? Math.round((totalRests - revisitedRests) / totalRests * 100) : null;

      // 카테고리 편식도
      const totalCatVisits = Array.from(catCounts.values()).reduce((s, c) => s + c, 0);
      const topCat = Array.from(catCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      const topCatRate = topCat && totalCatVisits > 0 ? Math.round(topCat[1] / totalCatVisits * 100) : null;
      const categoryBias = topCat ? { category: topCat[0], rate: topCatRate, uniqueCategories: catCounts.size } : null;

      // 평가 성향
      const detailAvgs: { field: string; label: string; avg: number }[] = [];
      const fieldLabels: Record<string, string> = {
        tasteRating: '맛', valueRating: '가성비', serviceRating: '서비스',
        cleanlinessRating: '청결', accessibilityRating: '접근성',
      };
      for (const [field, label] of Object.entries(fieldLabels)) {
        const vals = data.reviews.map((r) => r[field as keyof typeof r]).filter((v): v is number => v !== null && typeof v === 'number');
        if (vals.length > 0) detailAvgs.push({ field, label, avg: calcAvgRating(vals)! });
      }
      const generous = detailAvgs.length > 0 ? detailAvgs.reduce((a, b) => a.avg > b.avg ? a : b) : null;
      const strict = detailAvgs.length > 0 ? detailAvgs.reduce((a, b) => a.avg < b.avg ? a : b) : null;
      const ratingTendency = generous && strict && generous.field !== strict.field
        ? { generousOn: generous.label, generousAvg: generous.avg, strictOn: strict.label, strictAvg: strict.avg }
        : null;

      // 리뷰 성실도
      const reviewDiligence = memberVisitCount > 0 ? Math.round(data.reviews.length / memberVisitCount * 100) : null;

      // 주말파 vs 평일파
      const dayPreference = (weekdayCount + weekendCount) > 0
        ? { weekday: weekdayCount, weekend: weekendCount, type: weekendCount > weekdayCount ? 'weekend' as const : weekdayCount > weekendCount ? 'weekday' as const : 'balanced' as const }
        : null;

      return { userId: uid, nickname: data.nickname, explorerRate, categoryBias, ratingTendency, reviewDiligence, dayPreference };
    });

    // 베스트 콤비
    const comboCounts = new Map<string, { userA: string; nickA: string; userB: string; nickB: string; count: number }>();
    for (const visit of allVisits) {
      const participantIds = [
        ...(visit.createdById ? [visit.createdById] : []),
        ...visit.participants.map((p) => p.userId),
      ].filter((id, idx, arr) => arr.indexOf(id) === idx);

      for (let i = 0; i < participantIds.length; i++) {
        for (let j = i + 1; j < participantIds.length; j++) {
          const [a, b] = [participantIds[i], participantIds[j]].sort();
          const key = `${a}:${b}`;
          const existing = comboCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            const nickA = memberMap.get(a)?.nickname || '알 수 없음';
            const nickB = memberMap.get(b)?.nickname || '알 수 없음';
            comboCounts.set(key, { userA: a, nickA, userB: b, nickB, count: 1 });
          }
        }
      }
    }
    const bestCombos = Array.from(comboCounts.values()).sort((a, b) => b.count - a.count).slice(0, 3);

    return { memberBehaviors, bestCombos };
  }

  private analyzeRoomBehaviors(
    restaurants: { name: string; visits: { visitedAt: Date; waitTime: string | null; reviews: { rating: number }[] }[] }[],
    allVisits: { visitedAt: Date; waitTime: string | null; reviews: { rating: number }[] }[],
    catMap: Map<string, { count: number; ratings: number[] }>,
    monthlyVisits: { month: string; count: number }[],
  ) {
    const now = new Date();

    // 활성도 트렌드
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const recentCount = allVisits.filter((v) => new Date(v.visitedAt) >= threeMonthsAgo).length;
    const prevCount = allVisits.filter((v) => { const d = new Date(v.visitedAt); return d >= sixMonthsAgo && d < threeMonthsAgo; }).length;
    const activityTrend = prevCount > 0
      ? { recent: recentCount, previous: prevCount, changeRate: Math.round((recentCount - prevCount) / prevCount * 100) }
      : { recent: recentCount, previous: prevCount, changeRate: null };

    // 평점 인플레이션
    const sortedVisits = [...allVisits].sort((a, b) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime());
    const mid = Math.floor(sortedVisits.length / 2);
    let ratingInflation: { earlyAvg: number; lateAvg: number; change: number } | null = null;
    if (sortedVisits.length >= 4) {
      const earlyReviews = sortedVisits.slice(0, mid).flatMap((v) => v.reviews);
      const lateReviews = sortedVisits.slice(mid).flatMap((v) => v.reviews);
      if (earlyReviews.length > 0 && lateReviews.length > 0) {
        const earlyAvg = calcAvgRating(earlyReviews.map((r) => r.rating))!;
        const lateAvg = calcAvgRating(lateReviews.map((r) => r.rating))!;
        ratingInflation = { earlyAvg, lateAvg, change: Math.round((lateAvg - earlyAvg) * 10) / 10 };
      }
    }

    // 최장 미방문 식당
    const staleRestaurants = restaurants
      .filter((r) => r.visits.length > 0)
      .map((r) => {
        const lastVisit = r.visits.reduce((latest, v) =>
          new Date(v.visitedAt) > new Date(latest.visitedAt) ? v : latest, r.visits[0]);
        const daysSince = Math.floor((now.getTime() - new Date(lastVisit.visitedAt).getTime()) / MS_PER_DAY);
        return { name: r.name, lastVisitedAt: lastVisit.visitedAt, daysSince };
      })
      .filter((r) => r.daysSince >= 14)
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 5);

    // 카테고리 다양성 지수
    const totalCatCount = Array.from(catMap.values()).reduce((s, d) => s + d.count, 0);
    let diversityIndex: number | null = null;
    if (totalCatCount > 1 && catMap.size > 1) {
      const simpson = Array.from(catMap.values()).reduce((s, d) => s + (d.count / totalCatCount) ** 2, 0);
      diversityIndex = Math.round((1 - simpson) * 100);
    }

    // 웨이팅 감수 지수
    const visitsWithWait = allVisits.filter((v) => v.waitTime && v.waitTime !== '없음' && v.waitTime !== '0분').length;
    const waitTolerance = allVisits.length > 0 ? Math.round(visitsWithWait / allVisits.length * 100) : null;

    // 가장 활발한 월
    const peakMonth = monthlyVisits.length > 0 ? monthlyVisits.reduce((a, b) => a.count > b.count ? a : b) : null;

    return { activityTrend, ratingInflation, staleRestaurants, diversityIndex, waitTolerance, peakMonth };
  }

  // ─── 위시리스트 ───

  /** 위시리스트 토글 (추가/제거) */
  async toggleWishlist(roomId: string, restaurantId: string, userId: string): Promise<{ wishlisted: boolean }> {
    const restaurant = await this.prisma.read.roomRestaurant.findFirst({
      where: { id: restaurantId, roomId },
    });
    if (!restaurant) throw new NotFoundException('식당을 찾을 수 없습니다.');

    const existing = await this.prisma.read.roomWishlist.findUnique({
      where: { userId_roomRestaurantId: { userId, roomRestaurantId: restaurantId } },
    });

    if (existing) {
      await this.prisma.write.roomWishlist.delete({ where: { id: existing.id } });
      return { wishlisted: false };
    }

    await this.prisma.write.roomWishlist.create({
      data: { userId, roomRestaurantId: restaurantId },
    });
    return { wishlisted: true };
  }

  // ─── 공개 맛집 추천 ───

  /** 공개 맛집 추천 리스트 (비로그인 가능) */
  async getDiscoverRestaurants() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // 1) 최근 고평점 식당 — 최근 90일 내 리뷰 기준
    const recentReviews = await this.prisma.read.roomReview.findMany({
      where: { createdAt: { gte: ninetyDaysAgo } },
      select: {
        rating: true,
        visit: {
          select: {
            restaurant: { select: { name: true, address: true, category: true } },
          },
        },
      },
    });

    const ratedMap = new Map<string, { name: string; address: string; category: string; totalRating: number; count: number }>();
    for (const r of recentReviews) {
      const rest = r.visit.restaurant;
      const key = `${rest.name}||${rest.address}`;
      const entry = ratedMap.get(key) ?? { name: rest.name, address: rest.address, category: rest.category, totalRating: 0, count: 0 };
      entry.totalRating += r.rating;
      entry.count += 1;
      ratedMap.set(key, entry);
    }

    const topRated = Array.from(ratedMap.values())
      .filter((e) => e.count >= 2)
      .map((e) => ({ name: e.name, address: e.address, category: e.category, avgRating: Math.round((e.totalRating / e.count) * 10) / 10, reviewCount: e.count }))
      .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
      .slice(0, 10);

    // 2) 재방문 많은 식당 — 방문 2회 이상
    const restaurants = await this.prisma.read.roomRestaurant.findMany({
      select: {
        name: true,
        address: true,
        category: true,
        _count: { select: { visits: true } },
      },
    });

    const revisitMap = new Map<string, { name: string; address: string; category: string; visitCount: number }>();
    for (const r of restaurants) {
      const key = `${r.name}||${r.address}`;
      const entry = revisitMap.get(key) ?? { name: r.name, address: r.address, category: r.category, visitCount: 0 };
      entry.visitCount += r._count.visits;
      revisitMap.set(key, entry);
    }

    const mostRevisited = Array.from(revisitMap.values())
      .filter((e) => e.visitCount >= 2)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 10);

    // 3) 위시리스트 인기 식당
    const wishlisted = await this.prisma.read.roomWishlist.findMany({
      select: {
        roomRestaurant: { select: { name: true, address: true, category: true } },
      },
    });

    const wishMap = new Map<string, { name: string; address: string; category: string; wishlistCount: number }>();
    for (const w of wishlisted) {
      const rest = w.roomRestaurant;
      const key = `${rest.name}||${rest.address}`;
      const entry = wishMap.get(key) ?? { name: rest.name, address: rest.address, category: rest.category, wishlistCount: 0 };
      entry.wishlistCount += 1;
      wishMap.set(key, entry);
    }

    const mostWishlisted = Array.from(wishMap.values())
      .sort((a, b) => b.wishlistCount - a.wishlistCount)
      .slice(0, 10);

    return { topRated, mostRevisited, mostWishlisted };
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
      ...restaurants.map((r) => ({ type: 'restaurant_added' as const, date: r.createdAt, data: { restaurantName: r.name, user: r.addedBy } })),
      ...visits.map((v) => ({ type: 'visit_added' as const, date: v.createdAt, data: { restaurantName: v.restaurant.name, visitedAt: v.visitedAt, user: v.createdBy } })),
      ...reviews.map((r) => ({ type: 'review_added' as const, date: r.createdAt, data: { restaurantName: r.visit.restaurant.name, rating: r.rating, content: r.content.slice(0, 50), user: r.user } })),
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

  /** 알림 생성 헬퍼 (방 멤버 전체에게, 본인 제외) */
  async createNotificationForRoom(roomId: string, excludeUserId: string, type: string, message: string) {
    const members = await this.prisma.read.roomMember.findMany({ where: { roomId }, select: { userId: true } });
    const data = members
      .filter((m) => m.userId !== excludeUserId)
      .map((m) => ({ roomId, userId: m.userId, type, message }));
    if (data.length > 0) {
      await this.prisma.write.roomNotification.createMany({ data });
    }
  }

  // ──────────────── 리뷰 비교 ────────────────

  /** 같은 식당에 대한 멤버별 리뷰 비교 */
  async compareReviews(restaurantId: string) {
    const restaurant = await this.prisma.read.roomRestaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, roomId: true },
    });
    if (!restaurant) throw new NotFoundException('식당을 찾을 수 없습니다.');

    const reviews = await this.prisma.read.roomReview.findMany({
      where: { visit: { restaurantId } },
      include: {
        user: { select: { id: true, nickname: true } },
        visit: { select: { visitedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

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
}
