import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NoticesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 공지 생성 */
  async create(title: string, content: string, enabled: boolean) {
    return this.prisma.write.notice.create({
      data: { title, content, enabled },
    });
  }

  /** 전체 공지 조회 (관리자용, 비활성 포함) */
  async findAll() {
    // writer에서 읽어 생성/수정 직후 재조회 시 replication lag 방지
    return this.prisma.write.notice.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 활성 공지만 조회 (공개용) */
  async findActive() {
    return this.prisma.read.notice.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 공지 수정 */
  async update(id: string, data: { title?: string; content?: string; enabled?: boolean }) {
    const notice = await this.prisma.read.notice.findUnique({ where: { id } });
    if (!notice) throw new NotFoundException('공지사항을 찾을 수 없습니다.');

    return this.prisma.write.notice.update({
      where: { id },
      data,
    });
  }

  /** 공지 삭제 */
  async remove(id: string) {
    const notice = await this.prisma.read.notice.findUnique({ where: { id } });
    if (!notice) throw new NotFoundException('공지사항을 찾을 수 없습니다.');

    await this.prisma.write.notice.delete({ where: { id } });
  }
}
