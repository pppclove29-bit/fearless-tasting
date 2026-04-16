-- CreateTable: PostLike
CREATE TABLE `PostLike` (
  `id` VARCHAR(191) NOT NULL,
  `postId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `PostLike_postId_userId_key`(`postId`, `userId`),
  INDEX `PostLike_postId_idx`(`postId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: CommentLike
CREATE TABLE `CommentLike` (
  `id` VARCHAR(191) NOT NULL,
  `commentId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `CommentLike_commentId_userId_key`(`commentId`, `userId`),
  INDEX `CommentLike_commentId_idx`(`commentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PostLike` ADD CONSTRAINT `PostLike_postId_fkey`
  FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PostLike` ADD CONSTRAINT `PostLike_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommentLike` ADD CONSTRAINT `CommentLike_commentId_fkey`
  FOREIGN KEY (`commentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommentLike` ADD CONSTRAINT `CommentLike_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
