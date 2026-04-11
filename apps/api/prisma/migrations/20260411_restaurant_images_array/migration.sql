-- CreateTable: RoomRestaurantImage
CREATE TABLE `RoomRestaurantImage` (
  `id` VARCHAR(191) NOT NULL,
  `restaurantId` VARCHAR(191) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `RoomRestaurantImage_restaurantId_idx`(`restaurantId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RoomRestaurantImage` ADD CONSTRAINT `RoomRestaurantImage_restaurantId_fkey`
  FOREIGN KEY (`restaurantId`) REFERENCES `RoomRestaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing imageUrl data to RoomRestaurantImage table
INSERT INTO `RoomRestaurantImage` (`id`, `restaurantId`, `url`, `sortOrder`, `createdAt`)
SELECT CONCAT('img_', `id`), `id`, `imageUrl`, 0, NOW(3)
FROM `RoomRestaurant`
WHERE `imageUrl` IS NOT NULL;

-- Drop imageUrl column from RoomRestaurant
ALTER TABLE `RoomRestaurant` DROP COLUMN `imageUrl`;
