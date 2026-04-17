-- 재방문 의사: Boolean(TINYINT) → Int 5단계 (1~5)
-- 기존 true(1) → 4 (또 가고 싶어요), false(0) → 1 (안 갈 것 같아요)

-- 1) 타입 변경 (기존 0,1 값 유지)
ALTER TABLE `RoomReview` MODIFY COLUMN `wouldRevisit` INT NOT NULL DEFAULT 4;

-- 2) true(1) → 4 먼저 (0과 4만 남음)
UPDATE `RoomReview` SET `wouldRevisit` = 4 WHERE `wouldRevisit` = 1;

-- 3) false(0) → 1 (1과 4만 남음)
UPDATE `RoomReview` SET `wouldRevisit` = 1 WHERE `wouldRevisit` = 0;
