import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StorageService } from './storage.service';
import type { ImageFolder } from './storage.service';

@ApiTags('스토리지')
@Controller('upload')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /** Presigned URL 발급 (이미지 업로드용) */
  @Post('presigned-url')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Presigned URL 발급' })
  getPresignedUrl(
    @CurrentUser() user: { id: string },
    @Body() body: { folder: ImageFolder; contentType: string; targetId?: string },
  ) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(body.contentType)) {
      throw new BadRequestException('지원하지 않는 이미지 형식입니다 (jpg, png, webp만 가능)');
    }

    const allowedFolders: ImageFolder[] = ['profiles', 'reviews', 'restaurants'];
    if (!allowedFolders.includes(body.folder)) {
      throw new BadRequestException('잘못된 폴더입니다');
    }

    // profiles/reviews는 userId, restaurants는 targetId 사용
    const id = body.folder === 'restaurants' ? (body.targetId ?? user.id) : user.id;

    return this.storageService.getPresignedUploadUrl(body.folder, id, body.contentType);
  }
}
