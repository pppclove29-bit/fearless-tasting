import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsString()
  neighborhood: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
