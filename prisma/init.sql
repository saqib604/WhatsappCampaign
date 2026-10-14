CREATE TABLE IF NOT EXISTS `Template` (
  `id`        VARCHAR(191) NOT NULL,
  `name`      VARCHAR(191) NOT NULL,
  `content`   TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Template_name_key` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Campaign` (
  `id`         VARCHAR(191) NOT NULL,
  `name`       VARCHAR(191) NOT NULL,
  `status`     VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `templateId` VARCHAR(191) NULL,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Campaign_templateId_fkey` (`templateId`),
  CONSTRAINT `Campaign_templateId_fkey`
    FOREIGN KEY (`templateId`) REFERENCES `Template`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Message` (
  `id`           VARCHAR(191) NOT NULL,
  `campaignId`   VARCHAR(191) NOT NULL,
  `phoneNumber`  VARCHAR(191) NOT NULL,
  `status`       VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `variables`    JSON NOT NULL,
  `sentText`     TEXT NOT NULL,
  `errorMessage` TEXT NULL,
  `sentAt`       DATETIME(3) NULL,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Message_campaignId_fkey` (`campaignId`),
  CONSTRAINT `Message_campaignId_fkey`
    FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;