-- CreateTable
CREATE TABLE `RoomPoll` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `endsAt` DATETIME(3) NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoomPoll_roomId_status_idx`(`roomId`, `status`),
    INDEX `RoomPoll_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomPollOption` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(200) NOT NULL,
    `restaurantId` VARCHAR(191) NULL,
    `pollId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoomPollOption_pollId_idx`(`pollId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomPollVote` (
    `id` VARCHAR(191) NOT NULL,
    `optionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RoomPollVote_optionId_userId_key`(`optionId`, `userId`),
    INDEX `RoomPollVote_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomNotification` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoomNotification_userId_isRead_createdAt_idx`(`userId`, `isRead`, `createdAt`),
    INDEX `RoomNotification_roomId_idx`(`roomId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RoomPoll` ADD CONSTRAINT `RoomPoll_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RoomPoll` ADD CONSTRAINT `RoomPoll_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomPollOption` ADD CONSTRAINT `RoomPollOption_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `RoomRestaurant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RoomPollOption` ADD CONSTRAINT `RoomPollOption_pollId_fkey` FOREIGN KEY (`pollId`) REFERENCES `RoomPoll`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomPollVote` ADD CONSTRAINT `RoomPollVote_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `RoomPollOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RoomPollVote` ADD CONSTRAINT `RoomPollVote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomNotification` ADD CONSTRAINT `RoomNotification_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RoomNotification` ADD CONSTRAINT `RoomNotification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
