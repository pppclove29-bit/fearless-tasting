import { IsString, IsOptional } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsString()
  province!: string;

  @IsString()
  city!: string;

  @IsString()
  neighborhood!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
