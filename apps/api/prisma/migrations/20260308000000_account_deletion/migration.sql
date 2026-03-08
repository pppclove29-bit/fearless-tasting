-- Account: onDelete Cascade (user 삭제 시 계정도 삭제)
ALTER TABLE `Account` DROP FOREIGN KEY `Account_userId_fkey`;
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RoomMember: onDelete Cascade (user 삭제 시 멤버십도 삭제)
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

-- RoomVisitParticipant: onDelete Cascade (user 삭제 시 참여 기록도 삭제)
ALTER TABLE `RoomVisitParticipant` DROP FOREIGN KEY `RoomVisitParticipant_userId_fkey`;
ALTER TABLE `RoomVisitParticipant` ADD CONSTRAINT `RoomVisitParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RoomReview: onDelete Cascade (user 삭제 시 리뷰도 삭제)
ALTER TABLE `RoomReview` DROP FOREIGN KEY `RoomReview_userId_fkey`;
ALTER TABLE `RoomReview` ADD CONSTRAINT `RoomReview_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RoomKick: onDelete Cascade (user 삭제 시 강퇴 기록도 삭제)
ALTER TABLE `RoomKick` DROP FOREIGN KEY `RoomKick_userId_fkey`;
ALTER TABLE `RoomKick` ADD CONSTRAINT `RoomKick_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
