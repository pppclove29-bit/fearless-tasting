import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InquiriesService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly prisma: PrismaService) {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure: Number(port) === 465,
        auth: { user, pass },
      });
    }
  }

  /** 문의 등록 + 관리자 이메일 알림 (SMTP 설정 시) */
  async create(category: string, email: string, subject: string, content: string) {
    const inquiry = await this.prisma.write.inquiry.create({
      data: { category, email, subject, content },
    });

    await this.sendNotification(inquiry);

    return inquiry;
  }

  /** 문의 목록 조회 */
  async findAll() {
    return this.prisma.read.inquiry.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 관리자 이메일 알림 (SMTP 미설정 시 스킵) */
  private async sendNotification(inquiry: { category: string; email: string; subject: string; content: string }) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!this.transporter || !adminEmail) return;

    const categoryLabel: Record<string, string> = {
      region_request: '지역 추가 요청',
      bug_report: '버그 신고',
      feedback: '피드백',
      other: '기타',
    };

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_USER,
        to: adminEmail,
        subject: `[무모한 시식가] ${categoryLabel[inquiry.category] || '문의'}: ${inquiry.subject}`,
        text: `유형: ${categoryLabel[inquiry.category] || inquiry.category}\n보낸 사람: ${inquiry.email}\n\n${inquiry.content}`,
      });
    } catch {
      // SMTP 실패해도 문의 저장은 성공이므로 에러 무시
    }
  }
}
