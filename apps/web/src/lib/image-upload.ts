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

export type UploadStage = 'compressing' | 'uploading' | 'done';

export interface UploadProgress {
  stage: UploadStage;
  /** 업로드 단계에서만 유효 (0~100). 다른 단계에서는 null */
  percent: number | null;
}

/**
 * 이미지 파일을 압축 후 R2에 업로드. onProgress 콜백으로 단계·퍼센트 전달.
 */
export async function uploadImage(
  file: File,
  folder: ImageFolder,
  targetId?: string,
  onProgress?: (p: UploadProgress) => void,
): Promise<UploadResult> {
  onProgress?.({ stage: 'compressing', percent: null });
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/webp',
  });

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

  onProgress?.({ stage: 'uploading', percent: 0 });
  await uploadWithProgress(uploadUrl, compressed, (p) => onProgress?.({ stage: 'uploading', percent: p }));
  onProgress?.({ stage: 'done', percent: 100 });

  return { imageUrl, key };
}

function uploadWithProgress(url: string, blob: Blob, onPercent: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', 'image/webp');
    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable) return;
      onPercent(Math.round((e.loaded / e.total) * 100));
    });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error('이미지 업로드 실패'));
    };
    xhr.onerror = () => reject(new Error('이미지 업로드 네트워크 오류'));
    xhr.send(blob);
  });
}

/**
 * 여러 이미지 병렬 업로드 (최대 maxCount장).
 * onProgress는 인덱스별 진행 상황 전달.
 */
export async function uploadImages(
  files: File[],
  folder: ImageFolder,
  maxCount = 3,
  targetId?: string,
  onProgress?: (index: number, p: UploadProgress) => void,
): Promise<UploadResult[]> {
  const limited = files.slice(0, maxCount);
  return Promise.all(limited.map((file, i) =>
    uploadImage(file, folder, targetId, (p) => onProgress?.(i, p)),
  ));
}
