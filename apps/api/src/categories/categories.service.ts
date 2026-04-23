import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CategoryResolution {
  categoryId: number | null;
  displayName: string;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 활성 카테고리 목록 (공개 UI 칩/필터용, 표시 순서대로) */
  async listActive() {
    return this.prisma.read.category.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, emoji: true },
    });
  }

  /** 전체 카테고리 목록 (관리자용, 비활성 포함) */
  async listAll() {
    return this.prisma.read.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * 원본 문자열을 카테고리 ID + 표시명으로 해석.
   * 1) Category.name 정확 일치
   * 2) CategoryMapping.rawInput 정확 일치
   * 3) 카카오맵 "음식점 > X > Y" 계층 분해 후 각 파트 재시도
   * 4) 실패 시 categoryId=null, displayName=원본 (trim) — CMS 매핑 대기
   */
  async resolve(raw: string | null | undefined): Promise<CategoryResolution> {
    if (!raw) return { categoryId: null, displayName: '' };
    const trimmed = raw.trim();
    if (!trimmed) return { categoryId: null, displayName: '' };

    const direct = await this.prisma.read.category.findUnique({
      where: { name: trimmed },
      select: { id: true, name: true },
    });
    if (direct) return { categoryId: direct.id, displayName: direct.name };

    const mapped = await this.prisma.read.categoryMapping.findUnique({
      where: { rawInput: trimmed },
      include: { category: { select: { id: true, name: true } } },
    });
    if (mapped) return { categoryId: mapped.categoryId, displayName: mapped.category.name };

    const parts = trimmed
      .split('>')
      .map((p) => p.trim())
      .filter((p) => p && p !== '음식점');

    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      const partDirect = await this.prisma.read.category.findUnique({
        where: { name: part },
        select: { id: true, name: true },
      });
      if (partDirect) return { categoryId: partDirect.id, displayName: partDirect.name };

      const partMapped = await this.prisma.read.categoryMapping.findUnique({
        where: { rawInput: part },
        include: { category: { select: { id: true, name: true } } },
      });
      if (partMapped) return { categoryId: partMapped.categoryId, displayName: partMapped.category.name };
    }

    return { categoryId: null, displayName: trimmed };
  }

  /** 관리자: 카테고리 생성 */
  async createCategory(data: { name: string; emoji?: string; displayOrder?: number; isActive?: boolean }) {
    const existing = await this.prisma.read.category.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictException('이미 존재하는 카테고리입니다.');

    return this.prisma.write.category.create({
      data: {
        name: data.name,
        emoji: data.emoji ?? null,
        displayOrder: data.displayOrder ?? 999,
        isActive: data.isActive ?? true,
      },
    });
  }

  /** 관리자: 카테고리 수정 */
  async updateCategory(id: number, data: { name?: string; emoji?: string | null; displayOrder?: number; isActive?: boolean }) {
    const existing = await this.prisma.read.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('카테고리를 찾을 수 없습니다.');

    if (data.name && data.name !== existing.name) {
      const dup = await this.prisma.read.category.findUnique({ where: { name: data.name } });
      if (dup) throw new ConflictException('이미 존재하는 카테고리 이름입니다.');
    }

    return this.prisma.write.category.update({
      where: { id },
      data: {
        name: data.name,
        emoji: data.emoji,
        displayOrder: data.displayOrder,
        isActive: data.isActive,
      },
    });
  }

  /** 관리자: 카테고리 삭제 (연결된 식당은 categoryId=null로, 매핑은 cascade 삭제) */
  async deleteCategory(id: number) {
    const existing = await this.prisma.read.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('카테고리를 찾을 수 없습니다.');

    return this.prisma.write.category.delete({ where: { id } });
  }

  /**
   * 관리자: 미매핑 원본 값 목록 (식당 category 중 categoryId가 null인 값).
   * 동일 원본으로 묶어 카운트와 예시 식당을 함께 반환.
   */
  async listUnmapped() {
    // Prisma groupBy로 raw category 값 + 식당 수 집계
    const grouped = await this.prisma.read.roomRestaurant.groupBy({
      by: ['category'],
      where: { categoryId: null },
      _count: { _all: true },
      orderBy: { _count: { category: 'desc' } },
      take: 200,
    });

    return grouped.map((g) => ({
      rawInput: g.category,
      count: g._count._all,
    }));
  }

  /** 관리자: 매핑 규칙 목록 */
  async listMappings() {
    return this.prisma.read.categoryMapping.findMany({
      orderBy: [{ categoryId: 'asc' }, { rawInput: 'asc' }],
      include: { category: { select: { id: true, name: true, emoji: true } } },
    });
  }

  /**
   * 관리자: 매핑 생성/수정 (upsert).
   * 1) CategoryMapping 레코드 upsert (rawInput → categoryId)
   * 2) 동일 raw 값을 가진 RoomRestaurant 일괄 업데이트 (categoryId + category 표시명 갱신)
   */
  async upsertMapping(rawInput: string, categoryId: number) {
    const trimmed = rawInput.trim();
    if (!trimmed) throw new BadRequestException('원본 문자열은 비워둘 수 없습니다.');

    const category = await this.prisma.read.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('대상 카테고리를 찾을 수 없습니다.');

    return this.prisma.write.$transaction(async (tx) => {
      const mapping = await tx.categoryMapping.upsert({
        where: { rawInput: trimmed },
        update: { categoryId },
        create: { rawInput: trimmed, categoryId },
        include: { category: { select: { id: true, name: true, emoji: true } } },
      });

      const updated = await tx.roomRestaurant.updateMany({
        where: { category: trimmed, categoryId: null },
        data: { categoryId, category: category.name },
      });

      return { mapping, updatedRestaurants: updated.count };
    });
  }

  /** 관리자: 매핑 삭제 (기존 매핑된 식당은 categoryId 유지) */
  async deleteMapping(id: number) {
    const existing = await this.prisma.read.categoryMapping.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('매핑을 찾을 수 없습니다.');

    return this.prisma.write.categoryMapping.delete({ where: { id } });
  }
}
