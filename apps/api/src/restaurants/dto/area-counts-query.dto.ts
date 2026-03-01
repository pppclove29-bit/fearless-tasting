import { IsString, IsOptional } from 'class-validator';

export class AreaCountsQueryDto {
  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;
}
