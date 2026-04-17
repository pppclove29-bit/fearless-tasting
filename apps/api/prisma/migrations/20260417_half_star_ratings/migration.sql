-- AlterTable: rating 필드들 Int → Float (0.5 단위 평점 지원)
ALTER TABLE `RoomReview` MODIFY `rating` DOUBLE NOT NULL;
ALTER TABLE `RoomReview` MODIFY `tasteRating` DOUBLE NULL;
ALTER TABLE `RoomReview` MODIFY `valueRating` DOUBLE NULL;
ALTER TABLE `RoomReview` MODIFY `serviceRating` DOUBLE NULL;
ALTER TABLE `RoomReview` MODIFY `cleanlinessRating` DOUBLE NULL;
ALTER TABLE `RoomReview` MODIFY `accessibilityRating` DOUBLE NULL;
