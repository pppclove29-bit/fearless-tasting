-- AlterTable
ALTER TABLE `Room`
    ADD COLUMN `tabWishlistEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `tabRegionEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `tabPollEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `tabStatsEnabled` BOOLEAN NOT NULL DEFAULT false;
