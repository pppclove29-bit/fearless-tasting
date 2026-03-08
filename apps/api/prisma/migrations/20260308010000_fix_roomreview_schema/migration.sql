-- RoomReview: restaurantId 기반 → visitId 기반 전환
-- prisma db push 실패로 적용되지 않았던 스키마 변경 보정

-- 1. 기존 리뷰 삭제 (visitId 없이 연결 불가, 신규 서비스로 데이터 소량)
DELETE FROM `RoomReview`;

-- 2. restaurantId 컬럼 제거 (TiDB에서 FK가 실제 생성되지 않으므로 DROP FK 생략)
ALTER TABLE `RoomReview` DROP COLUMN `restaurantId`;

-- 4. 누락된 컬럼 추가
ALTER TABLE `RoomReview` ADD COLUMN `wouldRevisit` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `RoomReview` ADD COLUMN `tasteRating` INTEGER NULL;
ALTER TABLE `RoomReview` ADD COLUMN `valueRating` INTEGER NULL;
ALTER TABLE `RoomReview` ADD COLUMN `serviceRating` INTEGER NULL;
ALTER TABLE `RoomReview` ADD COLUMN `cleanlinessRating` INTEGER NULL;
ALTER TABLE `RoomReview` ADD COLUMN `accessibilityRating` INTEGER NULL;
ALTER TABLE `RoomReview` ADD COLUMN `favoriteMenu` VARCHAR(200) NULL;
ALTER TABLE `RoomReview` ADD COLUMN `tryNextMenu` VARCHAR(200) NULL;

-- 5. visitId 컬럼 추가
ALTER TABLE `RoomReview` ADD COLUMN `visitId` VARCHAR(191) NOT NULL;

-- 6. visitId FK 추가
ALTER TABLE `RoomReview` ADD CONSTRAINT `RoomReview_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `RoomVisit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. visitId + userId 유니크 제약 (방문당 1인 1리뷰)
CREATE UNIQUE INDEX `RoomReview_visitId_userId_key` ON `RoomReview`(`visitId`, `userId`);
