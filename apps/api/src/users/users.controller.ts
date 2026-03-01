import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** 사용자 목록 조회 */
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  /** 사용자 단건 조회 */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /** 사용자 조회 또는 생성 (닉네임 기반) */
  @Post()
  findOrCreate(@Body() dto: CreateUserDto) {
    return this.usersService.findOrCreate(dto.nickname, dto.profileImageUrl);
  }
}
