/**
 * 이미지 압축 + R2 presigned URL 업로드 헬퍼.
 * 브라우저에서 압축 후 R2에 직접 업로드 (서버 부하 0).
 */
import imageCompression from 'browser-image-compression';
import { apiFetch } from './api';

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

type ImageFolder = 'profiles' | 'reviews' | 'restaurants';

interface UploadResult {
  imageUrl: string;
  key: string;
}

/**
 * 이미지 파일을 압축 후 R2에 업로드.
 * @returns 공개 이미지 URL + R2 key
 */
export async function uploadImage(
  file: File,
  folder: ImageFolder,
  targetId?: string,
): Promise<UploadResult> {
  // 1. 브라우저에서 압축
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/webp',
  });

  // 2. Presigned URL 발급
  const res = await apiFetch(`${API_BASE}/upload/presigned-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder,
      contentType: 'image/webp',
      targetId,
    }),
  });

  if (!res.ok) throw new Error('업로드 URL 발급 실패');

  const { uploadUrl, imageUrl, key } = await res.json() as {
    uploadUrl: string;
    imageUrl: string;
    key: string;
  };

  // 3. R2에 직접 업로드
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/webp' },
    body: compressed,
  });

  if (!uploadRes.ok) throw new Error('이미지 업로드 실패');

  return { imageUrl, key };
}

/**
 * 여러 이미지를 순차 업로드 (최대 maxCount장)
 */
export async function uploadImages(
  files: File[],
  folder: ImageFolder,
  maxCount = 3,
  targetId?: string,
): Promise<UploadResult[]> {
  const limited = files.slice(0, maxCount);
  const results: UploadResult[] = [];

  for (const file of limited) {
    const result = await uploadImage(file, folder, targetId);
    results.push(result);
  }

  return results;
}
