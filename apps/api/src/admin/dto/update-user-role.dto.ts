import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({ description: '변경할 역할', enum: ['admin', 'user'] })
  @IsString()
  @IsIn(['admin', 'user'])
  role!: string;
}
