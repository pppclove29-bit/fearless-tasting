-- 0_init 베이스라인에 포함되었으나 prisma db push 실패로 실제 DB에 적용되지 않은 컬럼 추가
ALTER TABLE `RoomRestaurant` ADD COLUMN `waitTime` VARCHAR(20) NULL;
