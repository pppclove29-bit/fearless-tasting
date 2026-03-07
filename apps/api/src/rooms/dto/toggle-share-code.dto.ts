import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleShareCodeDto {
  @ApiProperty({ description: '공유 코드 액션', enum: ['enable', 'disable', 'regenerate'] })
  @IsIn(['enable', 'disable', 'regenerate'])
  action!: 'enable' | 'disable' | 'regenerate';
}
