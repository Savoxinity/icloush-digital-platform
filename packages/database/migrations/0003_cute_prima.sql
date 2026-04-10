CREATE TABLE `siteSolutionModules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`siteKey` enum('shop','lab','tech','care') NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`audience` varchar(255),
	`sortOrder` int NOT NULL DEFAULT 0,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'published',
	`metaJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteSolutionModules_id` PRIMARY KEY(`id`)
);
