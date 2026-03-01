import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('사용자')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** 사용자 목록 조회 */
  @Get()
  @ApiOperation({ summary: '사용자 목록 조회' })
  findAll() {
    return this.usersService.findAll();
  }

  /** 사용자 단건 조회 */
  @Get(':id')
  @ApiOperation({ summary: '사용자 단건 조회' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
