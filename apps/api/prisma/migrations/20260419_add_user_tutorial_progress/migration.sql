-- CreateTable
CREATE TABLE `UserTutorialProgress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tutorialKey` VARCHAR(50) NOT NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserTutorialProgress_userId_idx`(`userId`),
    UNIQUE INDEX `UserTutorialProgress_userId_tutorialKey_key`(`userId`, `tutorialKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserTutorialProgress` ADD CONSTRAINT `UserTutorialProgress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
