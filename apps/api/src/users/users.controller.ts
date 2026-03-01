import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

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
}
