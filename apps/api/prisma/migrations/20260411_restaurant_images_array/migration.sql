-- AlterTable: imageUrl → images (JSON array)
ALTER TABLE `RoomRestaurant` ADD COLUMN `images` TEXT NULL;

-- 기존 imageUrl이 있으면 JSON 배열로 변환
UPDATE `RoomRestaurant` SET `images` = JSON_ARRAY(`imageUrl`) WHERE `imageUrl` IS NOT NULL;

-- imageUrl 컬럼 제거
ALTER TABLE `RoomRestaurant` DROP COLUMN `imageUrl`;
