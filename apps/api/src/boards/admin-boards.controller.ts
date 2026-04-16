import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@ApiTags('관리자 - 게시판')
@Controller('admin/boards')
@UseGuards(AdminGuard)
export class AdminBoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  /** 게시판 목록 (관리자) */
  @Get()
  @ApiOperation({ summary: '게시판 목록 조회 (관리자)', description: '전체 게시판 목록을 조회합니다.' })
  findAll() {
    return this.boardsService.findAllBoards();
  }

  /** 게시판 생성 */
  @Post()
  @ApiOperation({ summary: '게시판 생성', description: '새 게시판을 생성합니다.' })
  create(@Body() dto: CreateBoardDto) {
    return this.boardsService.createBoard(dto.name, dto.slug, dto.description, dto.sortOrder, dto.enabled);
  }

  /** 게시판 수정 */
  @Patch(':id')
  @ApiOperation({ summary: '게시판 수정', description: '게시판 정보를 수정합니다.' })
  update(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.boardsService.updateBoard(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.enabled !== undefined && { enabled: dto.enabled }),
    });
  }

  /** 게시판 삭제 */
  @Delete(':id')
  @ApiOperation({ summary: '게시판 삭제', description: '게시판과 모든 게시글/댓글을 삭제합니다.' })
  remove(@Param('id') id: string) {
    return this.boardsService.deleteBoard(id);
  }
}
