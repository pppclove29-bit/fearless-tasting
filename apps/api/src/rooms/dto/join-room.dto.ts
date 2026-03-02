import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinRoomDto {
  @ApiProperty({ description: '8자 초대 코드', example: 'a1b2c3d4' })
  @IsString()
  @Length(8, 8)
  inviteCode!: string;
}
