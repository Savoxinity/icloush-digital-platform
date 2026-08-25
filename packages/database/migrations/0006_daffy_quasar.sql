CREATE TABLE `product_components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`type` enum('HEAD','BODY_WRAP','BASE') NOT NULL,
	`name` varchar(255) NOT NULL,
	`material` varchar(255),
	`extraPrice` bigint unsigned NOT NULL DEFAULT 0,
	`image_url` text,
	`specs` json,
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_components_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_components_brand_type_name_unique` UNIQUE(`brandId`,`type`,`name`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `currency` enum('CNY','USD') NOT NULL DEFAULT 'CNY';--> statement-breakpoint
ALTER TABLE `orderItems` ADD `customizationJson` json;--> statement-breakpoint
ALTER TABLE `products` ADD `price_usd` bigint unsigned;--> statement-breakpoint
CREATE INDEX `product_components_brand_type_status_index` ON `product_components` (`brandId`,`type`,`status`);