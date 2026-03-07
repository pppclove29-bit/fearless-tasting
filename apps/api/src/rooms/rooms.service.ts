import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const MAX_ROOM_MEMBERS = 2;

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
        data: { name, inviteCode, ownerId },
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
            _count: { select: { reviews: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!room) throw new NotFoundException('방을 찾을 수 없습니다');
    return room;
  }

  /** 초대 코드로 입장 */
  async join(inviteCode: string, userId: string) {
    const room = await this.prisma.read.room.findUnique({ where: { inviteCode } });
    if (!room) throw new NotFoundException('유효하지 않은 초대 코드입니다');

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
            _count: { select: { reviews: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!room) throw new NotFoundException('유효하지 않은 공유 링크입니다');

    return {
      ...room,
      restaurants: room.restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        address: r.address,
        province: r.province,
        city: r.city,
        neighborhood: r.neighborhood,
        category: r.category,
        imageUrl: r.imageUrl,
        reviewCount: r._count.reviews,
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
        roomId: true,
        reviews: {
          select: {
            id: true,
            rating: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { reviews: true } },
      },
    });

    if (!restaurant || restaurant.roomId !== room.id) {
      throw new NotFoundException('식당을 찾을 수 없습니다');
    }

    return {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      province: restaurant.province,
      city: restaurant.city,
      neighborhood: restaurant.neighborhood,
      category: restaurant.category,
      imageUrl: restaurant.imageUrl,
      reviewCount: restaurant._count.reviews,
      reviews: restaurant.reviews,
    };
  }

  // ─── 방 내 식당 ───

  /** 방 내 식당 목록 */
  async findRestaurants(roomId: string) {
    return this.prisma.read.roomRestaurant.findMany({
      where: { roomId },
      include: {
        addedBy: { select: { id: true, nickname: true } },
        _count: { select: { reviews: true } },
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
  ) {
    return this.prisma.write.roomRestaurant.create({
      data: { roomId, addedById, name, address, province, city, neighborhood, category, imageUrl },
    });
  }

  /** 방 내 식당 삭제 (본인 or manager+) */
  async removeRestaurant(roomId: string, restaurantId: string, userId: string, memberRole: string) {
    const restaurant = await this.prisma.read.roomRestaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant || restaurant.roomId !== roomId) {
      throw new NotFoundException('식당을 찾을 수 없습니다');
    }

    const isOwnerOrManager = memberRole === 'owner' || memberRole === 'manager';
    if (restaurant.addedById !== userId && !isOwnerOrManager) {
      throw new ForbiddenException('본인이 등록한 식당이거나 매니저 이상만 삭제할 수 있습니다');
    }

    return this.prisma.write.roomRestaurant.delete({ where: { id: restaurantId } });
  }

  /** 방 내 식당 상세 (리뷰 포함) */
  async findRestaurantDetail(roomId: string, restaurantId: string) {
    const restaurant = await this.prisma.read.roomRestaurant.findUnique({
      where: { id: restaurantId },
      include: {
        addedBy: { select: { id: true, nickname: true } },
        reviews: {
          include: { user: { select: { id: true, nickname: true, profileImageUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!restaurant || restaurant.roomId !== roomId) {
      throw new NotFoundException('식당을 찾을 수 없습니다');
    }

    return restaurant;
  }

  // ─── 방 내 리뷰 ───

  /** 방 내 리뷰 작성 */
  async createReview(roomId: string, restaurantId: string, userId: string, rating: number, content: string, wouldRevisit = true) {
    const restaurant = await this.prisma.read.roomRestaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant || restaurant.roomId !== roomId) {
      throw new NotFoundException('식당을 찾을 수 없습니다');
    }

    return this.prisma.write.roomReview.create({
      data: { roomRestaurantId: restaurantId, userId, rating, content, wouldRevisit },
    });
  }

  /** 방 내 리뷰 수정 (본인만) */
  async updateReview(reviewId: string, userId: string, rating?: number, content?: string, wouldRevisit?: boolean) {
    const review = await this.prisma.read.roomReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('리뷰를 찾을 수 없습니다');
    if (review.userId !== userId) throw new ForbiddenException('본인의 리뷰만 수정할 수 있습니다');

    return this.prisma.write.roomReview.update({
      where: { id: reviewId },
      data: {
        ...(rating !== undefined ? { rating } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(wouldRevisit !== undefined ? { wouldRevisit } : {}),
      },
    });
  }

  /** 방 내 리뷰 삭제 (본인 or manager+) */
  async removeReview(reviewId: string, userId: string, memberRole: string) {
    const review = await this.prisma.read.roomReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('리뷰를 찾을 수 없습니다');

    const isOwnerOrManager = memberRole === 'owner' || memberRole === 'manager';
    if (review.userId !== userId && !isOwnerOrManager) {
      throw new ForbiddenException('본인의 리뷰이거나 매니저 이상만 삭제할 수 있습니다');
    }

    return this.prisma.write.roomReview.delete({ where: { id: reviewId } });
  }
}
