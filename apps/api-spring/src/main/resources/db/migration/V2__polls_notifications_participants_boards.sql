-- ============================================================================
-- V2: 남은 Nest 기능 테이블 일괄 추가
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── RoomVisitParticipant ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `RoomVisitParticipant` (
  `id`      VARCHAR(30) NOT NULL,
  `visitId` VARCHAR(30) NOT NULL,
  `userId`  VARCHAR(30) NOT NULL,
  UNIQUE INDEX `RoomVisitParticipant_visitId_userId_key`(`visitId`, `userId`),
  INDEX `RoomVisitParticipant_userId_idx`(`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RoomVisitParticipant_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `RoomVisit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoomVisitParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── RoomPoll / Option / Vote ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `RoomPoll` (
  `id`          VARCHAR(30)  NOT NULL,
  `title`       VARCHAR(200) NOT NULL,
  `roomId`      VARCHAR(30)  NOT NULL,
  `createdById` VARCHAR(30)  NOT NULL,
  `endsAt`      DATETIME(3)  NULL,
  `status`      VARCHAR(10)  NOT NULL DEFAULT 'active',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `RoomPoll_roomId_status_idx`(`roomId`, `status`),
  INDEX `RoomPoll_createdById_idx`(`createdById`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RoomPoll_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoomPoll_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `RoomPollOption` (
  `id`           VARCHAR(30)  NOT NULL,
  `label`        VARCHAR(200) NOT NULL,
  `restaurantId` VARCHAR(30)  NULL,
  `pollId`       VARCHAR(30)  NOT NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `RoomPollOption_pollId_idx`(`pollId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RoomPollOption_pollId_fkey` FOREIGN KEY (`pollId`) REFERENCES `RoomPoll`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoomPollOption_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `RoomRestaurant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `RoomPollVote` (
  `id`        VARCHAR(30) NOT NULL,
  `optionId`  VARCHAR(30) NOT NULL,
  `userId`    VARCHAR(30) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `RoomPollVote_optionId_userId_key`(`optionId`, `userId`),
  INDEX `RoomPollVote_userId_idx`(`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RoomPollVote_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `RoomPollOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoomPollVote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── RoomNotification ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `RoomNotification` (
  `id`        VARCHAR(30)  NOT NULL,
  `roomId`    VARCHAR(30)  NOT NULL,
  `userId`    VARCHAR(30)  NOT NULL,
  `type`      VARCHAR(30)  NOT NULL,
  `message`   VARCHAR(500) NOT NULL,
  `isRead`    TINYINT(1)   NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `RoomNotification_userId_isRead_createdAt_idx`(`userId`, `isRead`, `createdAt`),
  INDEX `RoomNotification_roomId_idx`(`roomId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `RoomNotification_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoomNotification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── User 확장 필드 ────────────────────────────────────────────────────────
-- (이미 V1에 포함됨: pushEnabled, lastActiveAt, onboardingCompletedAt)

-- ─── UserTutorialProgress ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `UserTutorialProgress` (
  `id`          VARCHAR(30) NOT NULL,
  `userId`      VARCHAR(30) NOT NULL,
  `tutorialKey` VARCHAR(50) NOT NULL,
  `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `UserTutorialProgress_userId_tutorialKey_key`(`userId`, `tutorialKey`),
  INDEX `UserTutorialProgress_userId_idx`(`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `UserTutorialProgress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── DemoAccount ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `DemoAccount` (
  `id`        VARCHAR(30)  NOT NULL,
  `userId`    VARCHAR(30)  NOT NULL,
  `memo`      VARCHAR(200) NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `DemoAccount_userId_key`(`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `DemoAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── Board / Post / Comment / Likes / Bookmarks ────────────────────────────
CREATE TABLE IF NOT EXISTS `Board` (
  `id`              VARCHAR(30)  NOT NULL,
  `name`            VARCHAR(50)  NOT NULL,
  `slug`            VARCHAR(50)  NOT NULL,
  `description`     VARCHAR(200) NULL,
  `sortOrder`       INT          NOT NULL DEFAULT 0,
  `enabled`         TINYINT(1)   NOT NULL DEFAULT 1,
  `popularThreshold` INT         NOT NULL DEFAULT 5,
  `createdAt`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3)  NOT NULL,
  UNIQUE INDEX `Board_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Post` (
  `id`          VARCHAR(30)  NOT NULL,
  `title`       VARCHAR(200) NOT NULL,
  `content`     TEXT         NOT NULL,
  `boardId`     VARCHAR(30)  NOT NULL,
  `authorId`    VARCHAR(30)  NOT NULL,
  `isAnonymous` TINYINT(1)   NOT NULL DEFAULT 0,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  INDEX `Post_boardId_createdAt_idx`(`boardId`, `createdAt`),
  INDEX `Post_authorId_idx`(`authorId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Post_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `Board`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Post_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PostRestaurant` (
  `id`           VARCHAR(30)  NOT NULL,
  `postId`       VARCHAR(30)  NOT NULL,
  `name`         VARCHAR(100) NOT NULL,
  `address`      VARCHAR(300) NOT NULL,
  `category`     VARCHAR(50)  NULL,
  `latitude`     DOUBLE       NULL,
  `longitude`    DOUBLE       NULL,
  `kakaoPlaceId` VARCHAR(50)  NULL,
  INDEX `PostRestaurant_postId_idx`(`postId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `PostRestaurant_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PostLike` (
  `id`        VARCHAR(30) NOT NULL,
  `postId`    VARCHAR(30) NOT NULL,
  `userId`    VARCHAR(30) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PostLike_postId_userId_key`(`postId`, `userId`),
  INDEX `PostLike_postId_idx`(`postId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `PostLike_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PostLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Comment` (
  `id`          VARCHAR(30) NOT NULL,
  `content`     TEXT        NOT NULL,
  `postId`      VARCHAR(30) NOT NULL,
  `authorId`    VARCHAR(30) NOT NULL,
  `isAnonymous` TINYINT(1)  NOT NULL DEFAULT 0,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `Comment_postId_createdAt_idx`(`postId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Comment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Comment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CommentLike` (
  `id`        VARCHAR(30) NOT NULL,
  `commentId` VARCHAR(30) NOT NULL,
  `userId`    VARCHAR(30) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CommentLike_commentId_userId_key`(`commentId`, `userId`),
  INDEX `CommentLike_commentId_idx`(`commentId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `CommentLike_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CommentLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PostBookmark` (
  `id`        VARCHAR(30) NOT NULL,
  `postId`    VARCHAR(30) NOT NULL,
  `userId`    VARCHAR(30) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PostBookmark_postId_userId_key`(`postId`, `userId`),
  INDEX `PostBookmark_userId_idx`(`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `PostBookmark_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PostBookmark_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
