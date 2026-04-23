-- ============================================================================
-- Fearless Tasting · Spring Boot Baseline
--
-- 기존 Prisma 마이그레이션(0_init ~ 20260423_add_category_tables)이 적용된
-- 프로덕션 DB 스키마를 한 번에 재현.
--
-- 이 파일은 "Spring 단독 실행용 신규 DB" 또는 "마이그레이션 이관용 데이터베이스"
-- 에서만 실행해야 함. 기존 Prisma가 운영 중인 DB에는 flyway.baseline-on-migrate=true
-- 로 baseline 마크만 하고 이 스크립트는 실행되지 않음.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── User ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `User` (
  `id`                    VARCHAR(30)  NOT NULL,
  `email`                 VARCHAR(191) NOT NULL,
  `nickname`              VARCHAR(191) NOT NULL,
  `profileImageUrl`       VARCHAR(500) NULL,
  `role`                  VARCHAR(10)  NOT NULL DEFAULT 'user',
  `pushEnabled`           TINYINT(1)   NOT NULL DEFAULT 1,
  `lastActiveAt`          DATETIME(3)  NULL,
  `onboardingCompletedAt` DATETIME(3)  NULL,
  `createdAt`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3)  NOT NULL,
  UNIQUE INDEX `User_email_key`(`email`),
  UNIQUE INDEX `User_nickname_key`(`nickname`),
  INDEX `User_lastActiveAt_idx`(`lastActiveAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── Account (OAuth) ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Account` (
  `id`           VARCHAR(30)  NOT NULL,
  `provider`     VARCHAR(20)  NOT NULL,
  `providerId`   VARCHAR(191) NOT NULL,
  `refreshToken` TEXT         NULL,
  `userId`       VARCHAR(30)  NOT NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,
  UNIQUE INDEX `Account_provider_providerId_key`(`provider`, `providerId`),
  INDEX `Account_userId_idx`(`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── Category / CategoryMapping (CMS 관리 카테고리) ─────────────────────────
CREATE TABLE IF NOT EXISTS `Category` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(50)  NOT NULL,
  `emoji`        VARCHAR(10)  NULL,
  `displayOrder` INT          NOT NULL DEFAULT 0,
  `isActive`     TINYINT(1)   NOT NULL DEFAULT 1,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,
  UNIQUE INDEX `Category_name_key`(`name`),
  INDEX `Category_isActive_displayOrder_idx`(`isActive`, `displayOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CategoryMapping` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `rawInput`   VARCHAR(200) NOT NULL,
  `categoryId` INT          NOT NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3)  NOT NULL,
  UNIQUE INDEX `CategoryMapping_rawInput_key`(`rawInput`),
  INDEX `CategoryMapping_categoryId_idx`(`categoryId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `CategoryMapping_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── Room / RoomMember ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Room` (
  `id`                    VARCHAR(30)  NOT NULL,
  `name`                  VARCHAR(100) NOT NULL,
  `inviteCode`            VARCHAR(8)   NOT NULL,
  `inviteCodeExpiresAt`   DATETIME(3)  NULL,
  `isPublic`              TINYINT(1)   NOT NULL DEFAULT 0,
  `maxMembers`            INT          NOT NULL DEFAULT 4,
  `announcement`          VARCHAR(500) NULL,
  `tabWishlistEnabled`    TINYINT(1)   NOT NULL DEFAULT 1,
  `tabRegionEnabled`      TINYINT(1)   NOT NULL DEFAULT 1,
  `tabPollEnabled`        TINYINT(1)   NOT NULL DEFAULT 0,
  `tabStatsEnabled`       TINYINT(1)   NOT NULL DEFAULT 0,
  `ownerId`               VARCHAR(30)  NOT NULL,
  `createdAt`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3)  NOT NULL,
  UNIQUE INDEX `Room_inviteCode_key`(`inviteCode`),
  INDEX `Room_ownerId_idx`(`ownerId`),
  INDEX `Room_isPublic_updatedAt_idx`(`isPublic`, `updatedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Room_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `RoomMember` (
  `id`       VARCHAR(30) NOT NULL,
  `role`     VARCHAR(10) NOT NULL DEFAULT 'member',
  `roomId`   VARCHAR(30) NOT NULL,
  `userId`   VARCHAR(30) NOT NULL,
  `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `RoomMember_roomId_userId_key`(`roomId`, `userId`),
  INDEX `RoomMember_userId_idx`(`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RoomMember_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoomMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── RoomRestaurant + Visit + Review + Image ───────────────────────────────
CREATE TABLE IF NOT EXISTS `RoomRestaurant` (
  `id`           VARCHAR(30)  NOT NULL,
  `name`         VARCHAR(200) NOT NULL,
  `address`      VARCHAR(300) NOT NULL,
  `province`     VARCHAR(50)  NOT NULL,
  `city`         VARCHAR(50)  NOT NULL,
  `neighborhood` VARCHAR(100) NOT NULL,
  `category`     VARCHAR(100) NOT NULL,
  `categoryId`   INT          NULL,
  `latitude`     DOUBLE       NULL,
  `longitude`    DOUBLE       NULL,
  `isClosed`     TINYINT(1)   NOT NULL DEFAULT 0,
  `isWishlist`   TINYINT(1)   NOT NULL DEFAULT 0,
  `roomId`      VARCHAR(30)  NOT NULL,
  `addedById`    VARCHAR(30)  NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `RoomRestaurant_roomId_name_address_key`(`roomId`, `name`, `address`),
  INDEX `RoomRestaurant_roomId_idx`(`roomId`),
  INDEX `RoomRestaurant_addedById_idx`(`addedById`),
  INDEX `RoomRestaurant_categoryId_idx`(`categoryId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RoomRestaurant_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoomRestaurant_addedById_fkey` FOREIGN KEY (`addedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `RoomRestaurant_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `RoomRestaurantImage` (
  `id`           VARCHAR(30) NOT NULL,
  `restaurantId` VARCHAR(30) NOT NULL,
  `url`          VARCHAR(500) NOT NULL,
  `sortOrder`    INT          NOT NULL DEFAULT 0,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `RoomRestaurantImage_restaurantId_idx`(`restaurantId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RoomRestaurantImage_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `RoomRestaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `RoomVisit` (
  `id`           VARCHAR(30) NOT NULL,
  `visitedAt`    DATE         NOT NULL,
  `memo`         VARCHAR(500) NULL,
  `waitTime`     VARCHAR(20)  NULL,
  `isDelivery`   TINYINT(1)   NOT NULL DEFAULT 0,
  `restaurantId` VARCHAR(30) NOT NULL,
  `createdById`  VARCHAR(30) NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `RoomVisit_restaurantId_idx`(`restaurantId`),
  INDEX `RoomVisit_createdById_idx`(`createdById`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RoomVisit_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `RoomRestaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoomVisit_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `RoomReview` (
  `id`                  VARCHAR(30) NOT NULL,
  `rating`              DOUBLE      NOT NULL,
  `content`             TEXT        NOT NULL,
  `wouldRevisit`        INT         NOT NULL DEFAULT 4,
  `tasteRating`         DOUBLE      NULL,
  `valueRating`         DOUBLE      NULL,
  `serviceRating`       DOUBLE      NULL,
  `cleanlinessRating`   DOUBLE      NULL,
  `accessibilityRating` DOUBLE      NULL,
  `favoriteMenu`        VARCHAR(200) NULL,
  `tryNextMenu`         VARCHAR(200) NULL,
  `images`              TEXT        NULL,
  `visitId`             VARCHAR(30) NOT NULL,
  `userId`              VARCHAR(30) NOT NULL,
  `createdAt`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3) NOT NULL,
  UNIQUE INDEX `RoomReview_visitId_userId_key`(`visitId`, `userId`),
  INDEX `RoomReview_userId_idx`(`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RoomReview_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `RoomVisit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoomReview_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `RoomKick` (
  `id`       VARCHAR(30) NOT NULL,
  `roomId`   VARCHAR(30) NOT NULL,
  `userId`   VARCHAR(30) NOT NULL,
  `kickedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `RoomKick_roomId_userId_key`(`roomId`, `userId`),
  INDEX `RoomKick_userId_idx`(`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RoomKick_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoomKick_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Notice` (
  `id`        VARCHAR(30)  NOT NULL,
  `title`     VARCHAR(200) NOT NULL,
  `content`   TEXT         NOT NULL,
  `enabled`   TINYINT(1)   NOT NULL DEFAULT 1,
  `sortOrder` INT          NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)  NOT NULL,
  INDEX `Notice_enabled_sortOrder_idx`(`enabled`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Inquiry` (
  `id`        VARCHAR(30)  NOT NULL,
  `category`  VARCHAR(30)  NOT NULL,
  `email`     VARCHAR(200) NOT NULL,
  `subject`   VARCHAR(300) NOT NULL,
  `content`   TEXT         NOT NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `FcmToken` (
  `id`        VARCHAR(30)  NOT NULL,
  `userId`    VARCHAR(30)  NOT NULL,
  `token`     VARCHAR(500) NOT NULL,
  `device`    VARCHAR(200) NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)  NOT NULL,
  UNIQUE INDEX `FcmToken_token_key`(`token`),
  INDEX `FcmToken_userId_idx`(`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `FcmToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ─── Seed: 12 기본 카테고리 (기타 제외) ───────────────────────────────────
INSERT INTO `Category` (`name`, `emoji`, `displayOrder`, `isActive`, `createdAt`, `updatedAt`) VALUES
  ('한식',    '🍚',  10, 1, NOW(3), NOW(3)),
  ('중식',    '🥟',  20, 1, NOW(3), NOW(3)),
  ('일식',    '🍣',  30, 1, NOW(3), NOW(3)),
  ('양식',    '🍝',  40, 1, NOW(3), NOW(3)),
  ('카페',    '☕',  50, 1, NOW(3), NOW(3)),
  ('분식',    '🍜',  60, 1, NOW(3), NOW(3)),
  ('치킨',    '🍗',  70, 1, NOW(3), NOW(3)),
  ('피자',    '🍕',  80, 1, NOW(3), NOW(3)),
  ('고기',    '🥩',  90, 1, NOW(3), NOW(3)),
  ('해산물',  '🦐', 100, 1, NOW(3), NOW(3)),
  ('술집',    '🍺', 110, 1, NOW(3), NOW(3)),
  ('베이커리','🥖', 120, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE name = name;
