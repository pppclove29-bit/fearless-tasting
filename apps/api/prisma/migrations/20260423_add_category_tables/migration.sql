-- CreateTable: Category
CREATE TABLE `Category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `emoji` VARCHAR(10) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_name_key`(`name`),
    INDEX `Category_isActive_displayOrder_idx`(`isActive`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: CategoryMapping
CREATE TABLE `CategoryMapping` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rawInput` VARCHAR(200) NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CategoryMapping_rawInput_key`(`rawInput`),
    INDEX `CategoryMapping_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: CategoryMapping → Category
ALTER TABLE `CategoryMapping` ADD CONSTRAINT `CategoryMapping_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: RoomRestaurant.categoryId
ALTER TABLE `RoomRestaurant` ADD COLUMN `categoryId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `RoomRestaurant_categoryId_idx` ON `RoomRestaurant`(`categoryId`);

-- AddForeignKey: RoomRestaurant.categoryId → Category.id
ALTER TABLE `RoomRestaurant` ADD CONSTRAINT `RoomRestaurant_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: 12 preset categories (기타 제외)
INSERT INTO `Category` (`name`, `emoji`, `displayOrder`, `isActive`, `createdAt`, `updatedAt`) VALUES
    ('한식', '🍚', 10, true, NOW(3), NOW(3)),
    ('중식', '🥟', 20, true, NOW(3), NOW(3)),
    ('일식', '🍣', 30, true, NOW(3), NOW(3)),
    ('양식', '🍝', 40, true, NOW(3), NOW(3)),
    ('카페', '☕', 50, true, NOW(3), NOW(3)),
    ('분식', '🍜', 60, true, NOW(3), NOW(3)),
    ('치킨', '🍗', 70, true, NOW(3), NOW(3)),
    ('피자', '🍕', 80, true, NOW(3), NOW(3)),
    ('고기', '🥩', 90, true, NOW(3), NOW(3)),
    ('해산물', '🦐', 100, true, NOW(3), NOW(3)),
    ('술집', '🍺', 110, true, NOW(3), NOW(3)),
    ('베이커리', '🥖', 120, true, NOW(3), NOW(3));

-- Seed: CategoryMapping (기존 CATEGORY_SYNONYMS 이관)
INSERT INTO `CategoryMapping` (`rawInput`, `categoryId`, `createdAt`, `updatedAt`)
SELECT v.`rawInput`, c.`id`, NOW(3), NOW(3)
FROM (
    SELECT '커피전문점' AS rawInput, '카페' AS targetName UNION ALL
    SELECT '디저트', '카페' UNION ALL
    SELECT '디저트카페', '카페' UNION ALL
    SELECT '커피', '카페' UNION ALL
    SELECT '차,커피', '카페' UNION ALL
    SELECT '테마카페', '카페' UNION ALL
    SELECT '브런치', '카페' UNION ALL
    SELECT '중국요리', '중식' UNION ALL
    SELECT '중식당', '중식' UNION ALL
    SELECT '중국집', '중식' UNION ALL
    SELECT '일본식', '일식' UNION ALL
    SELECT '일본요리', '일식' UNION ALL
    SELECT '스시', '일식' UNION ALL
    SELECT '초밥', '일식' UNION ALL
    SELECT '돈까스', '일식' UNION ALL
    SELECT '라멘', '일식' UNION ALL
    SELECT '우동', '일식' UNION ALL
    SELECT '회', '일식' UNION ALL
    SELECT '패밀리레스토랑', '양식' UNION ALL
    SELECT '양식당', '양식' UNION ALL
    SELECT '스테이크', '양식' UNION ALL
    SELECT '파스타', '양식' UNION ALL
    SELECT '햄버거', '양식' UNION ALL
    SELECT '고깃집', '고기' UNION ALL
    SELECT '고기구이', '고기' UNION ALL
    SELECT '육류,고기', '고기' UNION ALL
    SELECT '고기뷔페', '고기' UNION ALL
    SELECT '갈비,삼겹살', '고기' UNION ALL
    SELECT '해물,생선', '해산물' UNION ALL
    SELECT '생선회', '해산물' UNION ALL
    SELECT '수산물', '해산물' UNION ALL
    SELECT '해물탕', '해산물' UNION ALL
    SELECT '주점', '술집' UNION ALL
    SELECT '요리주점', '술집' UNION ALL
    SELECT '와인바', '술집' UNION ALL
    SELECT '호프,요리주점', '술집' UNION ALL
    SELECT '포장마차', '술집' UNION ALL
    SELECT '맥주,호프', '술집' UNION ALL
    SELECT '양주,바', '술집' UNION ALL
    SELECT '이자카야', '술집' UNION ALL
    SELECT '빵,베이커리', '베이커리' UNION ALL
    SELECT '제과,베이커리', '베이커리' UNION ALL
    SELECT '빵집', '베이커리' UNION ALL
    SELECT '제과점', '베이커리' UNION ALL
    SELECT '떡볶이', '분식' UNION ALL
    SELECT '김밥', '분식'
) AS v
JOIN `Category` AS c ON c.`name` = v.`targetName`;

-- Backfill: 기존 RoomRestaurant.category 값이 프리셋 12종과 일치하면 categoryId 세팅
-- (기타 / 매핑 불가 값은 NULL 유지 → CMS "매핑 대기" 목록에 노출됨)
UPDATE `RoomRestaurant` AS r
JOIN `Category` AS c ON c.`name` = r.`category`
SET r.`categoryId` = c.`id`
WHERE r.`categoryId` IS NULL;
