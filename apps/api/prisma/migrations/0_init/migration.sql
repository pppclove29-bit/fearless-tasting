-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `nickname` VARCHAR(191) NOT NULL,
    `profileImageUrl` VARCHAR(500) NULL,
    `role` VARCHAR(10) NOT NULL DEFAULT 'user',
    `lastActiveAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_nickname_key`(`nickname`),
    INDEX `User_lastActiveAt_idx`(`lastActiveAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(20) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `refreshToken` TEXT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Account_userId_idx`(`userId`),
    UNIQUE INDEX `Account_provider_providerId_key`(`provider`, `providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Room` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `inviteCode` VARCHAR(8) NOT NULL,
    `inviteCodeExpiresAt` DATETIME(3) NULL,
    `shareCode` VARCHAR(8) NULL,
    `shareCodeEnabled` BOOLEAN NOT NULL DEFAULT false,
    `ownerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Room_inviteCode_key`(`inviteCode`),
    UNIQUE INDEX `Room_shareCode_key`(`shareCode`),
    INDEX `Room_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomMember` (
    `id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(10) NOT NULL DEFAULT 'member',
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoomMember_userId_idx`(`userId`),
    UNIQUE INDEX `RoomMember_roomId_userId_key`(`roomId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomRestaurant` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `address` VARCHAR(500) NOT NULL,
    `province` VARCHAR(50) NOT NULL,
    `city` VARCHAR(50) NOT NULL,
    `neighborhood` VARCHAR(100) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `imageUrl` VARCHAR(500) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `addedById` VARCHAR(191) NOT NULL,
    `waitTime` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoomRestaurant_roomId_idx`(`roomId`),
    INDEX `RoomRestaurant_addedById_idx`(`addedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomVisit` (
    `id` VARCHAR(191) NOT NULL,
    `visitedAt` DATE NOT NULL,
    `memo` VARCHAR(500) NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoomVisit_restaurantId_idx`(`restaurantId`),
    INDEX `RoomVisit_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomVisitParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `RoomVisitParticipant_userId_idx`(`userId`),
    UNIQUE INDEX `RoomVisitParticipant_visitId_userId_key`(`visitId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomReview` (
    `id` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `wouldRevisit` BOOLEAN NOT NULL DEFAULT true,
    `tasteRating` INTEGER NULL,
    `valueRating` INTEGER NULL,
    `serviceRating` INTEGER NULL,
    `cleanlinessRating` INTEGER NULL,
    `accessibilityRating` INTEGER NULL,
    `favoriteMenu` VARCHAR(200) NULL,
    `tryNextMenu` VARCHAR(200) NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RoomReview_userId_idx`(`userId`),
    UNIQUE INDEX `RoomReview_visitId_userId_key`(`visitId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomKick` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `kickedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoomKick_userId_idx`(`userId`),
    UNIQUE INDEX `RoomKick_roomId_userId_key`(`roomId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inquiry` (
    `id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(30) NOT NULL,
    `email` VARCHAR(200) NOT NULL,
    `subject` VARCHAR(300) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Room` ADD CONSTRAINT `Room_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomMember` ADD CONSTRAINT `RoomMember_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomMember` ADD CONSTRAINT `RoomMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomRestaurant` ADD CONSTRAINT `RoomRestaurant_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomRestaurant` ADD CONSTRAINT `RoomRestaurant_addedById_fkey` FOREIGN KEY (`addedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomVisit` ADD CONSTRAINT `RoomVisit_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `RoomRestaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomVisit` ADD CONSTRAINT `RoomVisit_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomVisitParticipant` ADD CONSTRAINT `RoomVisitParticipant_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `RoomVisit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomVisitParticipant` ADD CONSTRAINT `RoomVisitParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomReview` ADD CONSTRAINT `RoomReview_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `RoomVisit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomReview` ADD CONSTRAINT `RoomReview_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomKick` ADD CONSTRAINT `RoomKick_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomKick` ADD CONSTRAINT `RoomKick_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

