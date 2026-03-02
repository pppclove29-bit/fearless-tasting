import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({ description: '변경할 역할', enum: ['manager', 'member'] })
  @IsIn(['manager', 'member'])
  role!: 'manager' | 'member';
}
