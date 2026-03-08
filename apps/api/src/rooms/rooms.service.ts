import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const MAX_ROOM_MEMBERS = 4;

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 고유 8자 초대 코드 생성 */
  private async generateInviteCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = randomBytes(4).toString('hex');
      const existing = await this.prisma.read.room.findUnique({ where: { inviteCode: code } });
      if (!existing) return code;
    }
    throw new ConflictException('초대 코드 생성에 실패했습니다. 다시 시도해 주세요.');
  }

  /** 방 생성 (생성자 = owner) */
  async create(name: string, ownerId: string) {
    const inviteCode = await this.generateInviteCode();

    return this.prisma.write.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          name,
          inviteCode,
          inviteCodeExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
  async findOne(roomId: string) {
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

    return {
      ...room,
      restaurants: room.restaurants.map(({ visits, ...rest }) => {
        const allRatings = visits.flatMap((v) => v.reviews.map((r) => r.rating));
        return {
          ...rest,
          avgRating: allRatings.length > 0
            ? Math.round(allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length * 10) / 10
            : null,
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

    const memberCount = await this.prisma.read.roomMember.count({
      where: { roomId: room.id },
    });
    if (memberCount >= MAX_ROOM_MEMBERS) {
      throw new ForbiddenException(`방 인원이 가득 찼습니다 (최대 ${MAX_ROOM_MEMBERS}명)`);
    }

    await this.prisma.write.roomMember.create({
      data: { role: 'member', roomId: room.id, userId },
    });

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
        inviteCodeExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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

    return this.prisma.write.roomMember.delete({ where: { id: member.id } });
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
    for (let i = 0; i < 10; i++) {
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
    return this.prisma.write.roomRestaurant.create({
      data: { roomId, addedById, name, address, province, city, neighborhood, category, imageUrl, latitude, longitude },
    });
  }

  /** 방 내 식당 수정 (본인 or manager+) */
  async updateRestaurant(
    roomId: string,
    restaurantId: string,
    userId: string,
    memberRole: 'owner' | 'manager' | 'member',
    data: { name?: string; category?: string },
  ) {
    const restaurant = await this.prisma.read.roomRestaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant || restaurant.roomId !== roomId) {
      throw new NotFoundException('식당을 찾을 수 없습니다');
    }
    const isOwnerOrManager = memberRole === 'owner' || memberRole === 'manager';
    if ((!restaurant.addedById || restaurant.addedById !== userId) && !isOwnerOrManager) {
      throw new ForbiddenException('본인이 등록한 식당이거나 매니저 이상만 수정할 수 있습니다');
    }

    return this.prisma.write.roomRestaurant.update({
      where: { id: restaurantId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
      },
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

    const isOwnerOrManager = memberRole === 'owner' || memberRole === 'manager';
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

    return this.prisma.write.roomVisit.create({
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

    const isOwnerOrManager = memberRole === 'owner' || memberRole === 'manager';
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

    const isOwnerOrManager = memberRole === 'owner' || memberRole === 'manager';
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
    const visit = await this.prisma.read.roomVisit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException('방문 기록을 찾을 수 없습니다');

    const existing = await this.prisma.read.roomReview.findUnique({
      where: { visitId_userId: { visitId, userId } },
    });
    if (existing) {
      throw new ConflictException('이 방문에 이미 리뷰를 작성했습니다. 기존 리뷰를 수정해 주세요.');
    }

    return this.prisma.write.roomReview.create({
      data: {
        visitId, userId, rating, content, wouldRevisit,
        tasteRating, valueRating, serviceRating, cleanlinessRating, accessibilityRating,
        favoriteMenu, tryNextMenu,
      },
    });
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

    const isOwnerOrManager = memberRole === 'owner' || memberRole === 'manager';
    if (review.userId !== userId && !isOwnerOrManager) {
      throw new ForbiddenException('본인의 리뷰이거나 매니저 이상만 삭제할 수 있습니다');
    }

    return this.prisma.write.roomReview.delete({ where: { id: reviewId } });
  }

  // ─── 빠른 리뷰 (방문 + 리뷰 동시 생성) ───

  /** 방문 기록과 리뷰를 한 번에 생성 */
  async createQuickReview(
    roomId: string,
    restaurantId: string,
    userId: string,
    visitedAt: string,
    memo: string | undefined,
    waitTime: string | undefined,
    participantIds: string[] | undefined,
    rating: number,
    content: string,
    wouldRevisit: boolean,
    tasteRating?: number,
    valueRating?: number,
    serviceRating?: number,
    cleanlinessRating?: number,
    accessibilityRating?: number,
    favoriteMenu?: string,
    tryNextMenu?: string,
  ) {
    const restaurant = await this.prisma.read.roomRestaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant || restaurant.roomId !== roomId) {
      throw new NotFoundException('식당을 찾을 수 없습니다');
    }

    return this.prisma.write.$transaction(async (tx) => {
      const visit = await tx.roomVisit.create({
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
      });

      const review = await tx.roomReview.create({
        data: {
          visitId: visit.id, userId, rating, content, wouldRevisit,
          tasteRating, valueRating, serviceRating, cleanlinessRating, accessibilityRating,
          favoriteMenu, tryNextMenu,
        },
      });

      return { visit, review };
    });
  }
}
