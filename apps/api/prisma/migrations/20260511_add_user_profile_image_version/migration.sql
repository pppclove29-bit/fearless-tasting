-- AlterTable: 프로필 이미지 캐시 버스팅 버전 컬럼 추가
ALTER TABLE `User` ADD COLUMN `profileImageVersion` INT NOT NULL DEFAULT 0;
