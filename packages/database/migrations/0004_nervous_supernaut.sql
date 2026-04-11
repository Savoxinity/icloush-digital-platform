CREATE TABLE `siteClientLogos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`siteKey` enum('shop','lab','tech','care') NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`logoText` varchar(64) NOT NULL,
	`tagline` varchar(255),
	`accentColor` varchar(32),
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'published',
	`sortOrder` int NOT NULL DEFAULT 0,
	`metaJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteClientLogos_id` PRIMARY KEY(`id`)
);
