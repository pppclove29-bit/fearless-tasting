import { IsString, IsOptional } from 'class-validator';

export class FindRestaurantsQueryDto {
  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;
}
