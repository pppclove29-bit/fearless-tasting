import { Controller, Get, Post, Body, UseGuards, InternalServerErrorException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateFeatureRequestDto } from './dto/create-feature-request.dto';

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  created_at: string;
  html_url: string;
}

interface FeatureRequestItem {
  id: number;
  title: string;
  state: string;
  createdAt: string;
  url: string;
}

@ApiTags('요구사항')
@Controller('admin/feature-requests')
@UseGuards(AdminGuard)
export class FeatureRequestsController {
  /** 요구사항 등록 (GitHub Issue 생성) */
  @Post()
  @ApiOperation({ summary: '요구사항 등록 (GitHub Issue 생성)' })
  async createFeatureRequest(@Body() dto: CreateFeatureRequestDto) {
    const response = await fetch(
      'https://api.github.com/repos/pppclove29-bit/fearless-tasting/issues',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: dto.title,
          body: `## 운영자 요구사항\n\n${dto.description}\n\n---\n_관리자 페이지에서 자동 생성됨_`,
          labels: ['feature-request', 'auto-merge'],
        }),
      },
    );

    if (!response.ok) {
      throw new InternalServerErrorException('GitHub Issue 생성에 실패했습니다');
    }

    return response.json();
  }

  /** 요구사항 목록 조회 (GitHub Issues) */
  @Get()
  @ApiOperation({ summary: '요구사항 목록 조회' })
  async getFeatureRequests(): Promise<FeatureRequestItem[]> {
    const response = await fetch(
      'https://api.github.com/repos/pppclove29-bit/fearless-tasting/issues?labels=feature-request&state=all&per_page=20',
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      },
    );

    if (!response.ok) return [];

    const issues = (await response.json()) as GitHubIssue[];
    return issues.map((issue) => ({
      id: issue.number,
      title: issue.title,
      state: issue.state,
      createdAt: issue.created_at,
      url: issue.html_url,
    }));
  }
}
