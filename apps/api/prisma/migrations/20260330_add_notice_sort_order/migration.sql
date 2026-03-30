-- AlterTable
ALTER TABLE `Notice` ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

-- DropIndex
DROP INDEX `Notice_enabled_createdAt_idx` ON `Notice`;

-- CreateIndex
CREATE INDEX `Notice_enabled_sortOrder_idx` ON `Notice`(`enabled`, `sortOrder`);
