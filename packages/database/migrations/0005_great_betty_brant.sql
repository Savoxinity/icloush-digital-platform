ALTER TABLE `products` ADD `code` varchar(64);--> statement-breakpoint
ALTER TABLE `products` ADD `series` enum('AP','FC');--> statement-breakpoint
ALTER TABLE `products` ADD `price` bigint unsigned;--> statement-breakpoint
ALTER TABLE `products` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `products` ADD `specs` json;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_brand_code_unique` UNIQUE(`brandId`,`code`);