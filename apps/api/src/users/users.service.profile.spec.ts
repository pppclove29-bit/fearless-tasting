import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';

function setup(previousUrl: string | null = null) {
  const update = jest.fn(
    (args: { data: { profileImageUrl?: string | null; nickname: string } }) => ({
      id: 'u1',
      email: 'a@example.test',
      nickname: args.data.nickname,
      role: 'user',
      profileImageUrl: args.data.profileImageUrl ?? null,
      profileImageVersion: 2,
    }),
  );
  const read = {
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue({ profileImageUrl: previousUrl }),
    },
  };
  const prisma: PrismaService = { read, write: { user: { update } } } as never;
  const deleteImage = jest.fn().mockResolvedValue(undefined);
  const storage: StorageService = { deleteImage } as never;
  return { service: new UsersService(prisma, storage), update, deleteImage };
}

describe('UsersService.updateProfile 프로필 사진', () => {
  it('업로드 API가 준 본인 키는 저장한다', async () => {
    const { service, update } = setup();
    await service.updateProfile('u1', '형준', 'profiles/u1.webp');
    expect(update.mock.calls[0][0].data.profileImageUrl).toBe('profiles/u1.webp');
  });

  it.each([
    ['다른 사람 키', 'profiles/u2.webp'],
    ['외부 URL', 'https://evil.example/x.png'],
    ['HTML 주입 시도', 'profiles/u1.webp" onerror="alert(1)'],
    ['허용 안 된 확장자', 'profiles/u1.svg'],
  ])('%s는 400', async (_label, url) => {
    const { service, update } = setup();
    await expect(service.updateProfile('u1', '형준', url)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('null이면 사진을 지우고, 올렸던 파일도 삭제한다', async () => {
    const { service, update, deleteImage } = setup('profiles/u1.webp');
    const result = await service.updateProfile('u1', '형준', null);
    expect(update.mock.calls[0][0].data.profileImageUrl).toBeNull();
    expect(result.profileImageUrl).toBeNull();
    expect(deleteImage).toHaveBeenCalledWith('profiles/u1.webp');
  });

  it('카카오 CDN 사진을 지울 때는 지울 파일이 없으므로 저장소를 건드리지 않는다', async () => {
    const { service, deleteImage } = setup('https://k.kakaocdn.net/dn/abc/img_640x640.jpg');
    await service.updateProfile('u1', '형준', null);
    expect(deleteImage).not.toHaveBeenCalled();
  });

  it('사진 필드를 안 보내면(닉네임만 변경) 사진은 그대로 둔다', async () => {
    const { service, update } = setup();
    await service.updateProfile('u1', '새닉네임');
    expect(update.mock.calls[0][0].data).not.toHaveProperty('profileImageUrl');
  });
});
