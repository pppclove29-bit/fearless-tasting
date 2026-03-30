import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TogglePublicDto {
  @ApiProperty({ description: '공개 여부' })
  @IsBoolean()
  isPublic!: boolean;
}
