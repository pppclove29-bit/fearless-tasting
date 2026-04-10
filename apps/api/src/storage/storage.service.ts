import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';

export type ImageFolder = 'profiles' | 'reviews' | 'restaurants';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client!: S3Client;
  private bucket!: string;
  private publicUrl!: string;
  private isConfigured = false;

  onModuleInit() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_BUCKET_NAME || 'fearless-tasting-images';
    this.publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

    if (!accountId || !accessKeyId || !secretAccessKey || !this.publicUrl) {
      this.logger.warn('R2 환경변수 미설정 — 이미지 업로드 비활성');
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.isConfigured = true;
    this.logger.log('R2 Storage 초기화 완료');
  }

  /**
   * Presigned PUT URL 발급.
   * 폴더 구조: profiles/{userId}.webp | reviews/{userId}/{ts}-{hash}.webp | restaurants/{restaurantId}.webp
   */
  async getPresignedUploadUrl(
    folder: ImageFolder,
    id: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; imageUrl: string; key: string }> {
    if (!this.isConfigured) {
      throw new Error('스토리지가 설정되지 않았습니다');
    }

    const ext = contentType === 'image/webp' ? 'webp'
      : contentType === 'image/png' ? 'png'
      : 'jpg';

    let key: string;
    switch (folder) {
      case 'profiles':
        key = `profiles/${id}.${ext}`;
        break;
      case 'reviews':
        key = `reviews/${id}/${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;
        break;
      case 'restaurants':
        key = `restaurants/${id}.${ext}`;
        break;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 300 });
    const imageUrl = `${this.publicUrl}/${key}`;

    return { uploadUrl, imageUrl, key };
  }

  /** 이미지 삭제 */
  async deleteImage(key: string) {
    if (!this.isConfigured) return;

    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
    } catch (err) {
      this.logger.error(`이미지 삭제 실패: ${key}`, err);
    }
  }
}
