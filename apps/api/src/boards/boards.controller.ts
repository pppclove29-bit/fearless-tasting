import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BoardsService } from './boards.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import type { Request } from 'express';
import { Req } from '@nestjs/common';

@ApiTags('커뮤니티')
@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  /** 활성 게시판 목록 (공개) */
  @Get()
  @ApiOperation({ summary: '게시판 목록', description: '활성화된 게시판 목록을 조회합니다.' })
  findEnabledBoards(@Query('search') search?: string) {
    return this.boardsService.findEnabledBoards(search || undefined);
  }

  /** 사이트맵용 데이터 (공개) */
  @Get('sitemap-data')
  @ApiOperation({ summary: '사이트맵 데이터', description: '게시판/게시글 사이트맵 데이터' })
  getSitemapData() {
    return this.boardsService.getSitemapData();
  }

  /** 내가 작성한 게시글 목록 (로그인 필요) */
  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '내 게시글 목록', description: '내가 작성한 게시글을 조회합니다.' })
  findMyPosts(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Req() req?: Request & { user: { id: string } },
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(pageSize || '20', 10) || 20));
    return this.boardsService.findMyPosts(req!.user.id, pageNum, limitNum);
  }

  /** 게시판 슬러그로 조회 (공개) */
  @Get(':slug')
  @ApiOperation({ summary: '게시판 조회', description: '슬러그로 게시판 정보를 조회합니다.' })
  findBoardBySlug(@Param('slug') slug: string) {
    return this.boardsService.findBoardBySlug(slug);
  }

  /** 게시글 목록 (공개, 페이지네이션) */
  @Get(':slug/posts')
  @ApiOperation({ summary: '게시글 목록', description: '게시판의 게시글 목록을 조회합니다.' })
  async findPosts(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const board = await this.boardsService.findBoardBySlug(slug);
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.boardsService.findPosts(board.id, pageNum, limitNum);
  }

  /** 게시글 상세 (공개, 로그인 시 isAuthor 포함) */
  @Get(':slug/posts/:postId')
  @ApiOperation({ summary: '게시글 상세', description: '게시글과 댓글을 조회합니다.' })
  findPostById(@Param('postId') postId: string, @Req() req: Request) {
    const userId = this.extractUserId(req);
    return this.boardsService.findPostById(postId, userId);
  }

  /** Bearer 토큰에서 userId 추출 (인증 필수 아님) */
  private extractUserId(req: Request): string | undefined {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    try {
      const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
      return payload.sub;
    } catch {
      return undefined;
    }
  }

  /** 게시글 작성 (로그인 필요) */
  @Post(':slug/posts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '게시글 작성', description: '게시판에 새 게시글을 작성합니다.' })
  async createPost(
    @Param('slug') slug: string,
    @Body() dto: CreatePostDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const board = await this.boardsService.findBoardBySlug(slug);
    return this.boardsService.createPost(board.id, req.user.id, dto.title, dto.content, dto.isAnonymous);
  }

  /** 게시글 수정 (작성자만) */
  @Patch(':slug/posts/:postId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '게시글 수정', description: '본인의 게시글을 수정합니다.' })
  updatePost(
    @Param('postId') postId: string,
    @Body() dto: UpdatePostDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.boardsService.updatePost(postId, req.user.id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.content !== undefined && { content: dto.content }),
    });
  }

  /** 게시글 삭제 (작성자 또는 관리자) */
  @Delete(':slug/posts/:postId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '게시글 삭제', description: '본인의 게시글 또는 관리자가 삭제합니다.' })
  deletePost(
    @Param('postId') postId: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.boardsService.deletePost(postId, req.user.id);
  }

  /** 댓글 작성 (로그인 필요) */
  @Post(':slug/posts/:postId/comments')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '댓글 작성', description: '게시글에 댓글을 작성합니다.' })
  createComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.boardsService.createComment(postId, req.user.id, dto.content);
  }

  /** 댓글 삭제 (작성자 또는 관리자) */
  @Delete(':slug/posts/:postId/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '댓글 삭제', description: '본인의 댓글 또는 관리자가 삭제합니다.' })
  deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.boardsService.deleteComment(commentId, req.user.id);
  }

  /** 게시글 추천 토글 */
  @Post(':slug/posts/:postId/like')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '게시글 추천/취소', description: '게시글을 추천하거나 추천을 취소합니다.' })
  togglePostLike(
    @Param('postId') postId: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.boardsService.togglePostLike(postId, req.user.id);
  }

  /** 게시글 북마크 토글 */
  @Post(':slug/posts/:postId/bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '게시글 북마크/취소', description: '게시글을 북마크하거나 북마크를 취소합니다.' })
  toggleBookmark(
    @Param('postId') postId: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.boardsService.toggleBookmark(postId, req.user.id);
  }

  /** 댓글 추천 토글 */
  @Post(':slug/posts/:postId/comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '댓글 추천/취소', description: '댓글을 추천하거나 추천을 취소합니다.' })
  toggleCommentLike(
    @Param('commentId') commentId: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.boardsService.toggleCommentLike(commentId, req.user.id);
  }
}
