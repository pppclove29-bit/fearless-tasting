-- prisma db push 실패로 생성되지 않은 테이블 보정 (IF NOT EXISTS로 안전하게)
CREATE TABLE IF NOT EXISTS `RoomVisit` (
    `id` VARCHAR(191) NOT NULL,
    `visitedAt` DATE NOT NULL,
    `memo` VARCHAR(500) NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoomVisit_restaurantId_idx`(`restaurantId`),
    INDEX `RoomVisit_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`),
    CONSTRAINT `RoomVisit_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `RoomRestaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `RoomVisit_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `RoomVisitParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `RoomVisitParticipant_userId_idx`(`userId`),
    UNIQUE INDEX `RoomVisitParticipant_visitId_userId_key`(`visitId`, `userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `RoomVisitParticipant_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `RoomVisit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `RoomVisitParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ═══ 회원 탈퇴용 FK 변경 ═══

-- Account: onDelete Cascade
ALTER TABLE `Account` DROP FOREIGN KEY `Account_userId_fkey`;
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RoomMember: onDelete Cascade
ALTER TABLE `RoomMember` DROP FOREIGN KEY `RoomMember_userId_fkey`;
ALTER TABLE `RoomMember` ADD CONSTRAINT `RoomMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RoomRestaurant: addedById nullable + onDelete SetNull
ALTER TABLE `RoomRestaurant` MODIFY `addedById` VARCHAR(191) NULL;
ALTER TABLE `RoomRestaurant` DROP FOREIGN KEY `RoomRestaurant_addedById_fkey`;
ALTER TABLE `RoomRestaurant` ADD CONSTRAINT `RoomRestaurant_addedById_fkey` FOREIGN KEY (`addedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RoomVisit: createdById nullable + onDelete SetNull
ALTER TABLE `RoomVisit` MODIFY `createdById` VARCHAR(191) NULL;
ALTER TABLE `RoomVisit` DROP FOREIGN KEY `RoomVisit_createdById_fkey`;
ALTER TABLE `RoomVisit` ADD CONSTRAINT `RoomVisit_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RoomVisitParticipant: onDelete Cascade
ALTER TABLE `RoomVisitParticipant` DROP FOREIGN KEY `RoomVisitParticipant_userId_fkey`;
ALTER TABLE `RoomVisitParticipant` ADD CONSTRAINT `RoomVisitParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RoomReview: onDelete Cascade
ALTER TABLE `RoomReview` DROP FOREIGN KEY `RoomReview_userId_fkey`;
ALTER TABLE `RoomReview` ADD CONSTRAINT `RoomReview_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RoomKick: onDelete Cascade
ALTER TABLE `RoomKick` DROP FOREIGN KEY `RoomKick_userId_fkey`;
ALTER TABLE `RoomKick` ADD CONSTRAINT `RoomKick_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
