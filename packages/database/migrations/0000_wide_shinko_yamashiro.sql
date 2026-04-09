CREATE TABLE `bankTransferReceipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`orderId` int NOT NULL,
	`paymentId` int,
	`payerName` varchar(255),
	`payerAccountNo` varchar(128),
	`receiptFileKey` varchar(255),
	`receiptFileUrl` varchar(500),
	`reviewStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bankTransferReceipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brandMemberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`userId` int NOT NULL,
	`memberType` enum('b2b_customer','b2c_customer','brand_admin','sales','finance','ops') NOT NULL,
	`enterpriseName` varchar(255),
	`contactName` varchar(255),
	`creditLimit` bigint unsigned,
	`priceLevel` varchar(64),
	`isDefaultBrand` boolean NOT NULL DEFAULT false,
	`status` enum('pending','approved','rejected','active','disabled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brandMemberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `brandMemberships_brand_user_unique` UNIQUE(`brandId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`shortName` varchar(100),
	`businessType` enum('b2b','b2c','hybrid') NOT NULL DEFAULT 'hybrid',
	`domain` varchar(255),
	`siteTitle` varchar(255),
	`siteDescription` text,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`),
	CONSTRAINT `brands_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `cartItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cartId` int NOT NULL,
	`brandId` int NOT NULL,
	`productId` int NOT NULL,
	`skuId` int NOT NULL,
	`quantity` int NOT NULL,
	`selectedPrice` bigint unsigned NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cartItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('active','checked_out','abandoned') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`sourceSite` varchar(100) NOT NULL,
	`sourcePage` varchar(255),
	`companyName` varchar(255),
	`contactName` varchar(255) NOT NULL,
	`mobile` varchar(32),
	`email` varchar(320),
	`roomCount` int,
	`laundryVolume` varchar(100),
	`message` text,
	`leadStatus` enum('new','assigned','contacted','qualified','closed','invalid') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`brandId` int NOT NULL,
	`productId` int NOT NULL,
	`skuId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`skuLabel` varchar(255),
	`unitPrice` bigint unsigned NOT NULL,
	`quantity` int NOT NULL,
	`lineAmount` bigint unsigned NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`userId` int NOT NULL,
	`membershipId` int,
	`orderNo` varchar(64) NOT NULL,
	`orderType` enum('b2b_purchase','b2c_purchase','subscription','service','rental') NOT NULL,
	`channel` enum('admin','web','mini_program','sales_manual') NOT NULL DEFAULT 'web',
	`status` enum('pending_payment','paid','under_review','processing','shipped','completed','cancelled','closed') NOT NULL DEFAULT 'pending_payment',
	`paymentStatus` enum('unpaid','paid','part_paid','offline_review','refunded') NOT NULL DEFAULT 'unpaid',
	`fulfillmentStatus` enum('unfulfilled','processing','partial_shipped','shipped','delivered') NOT NULL DEFAULT 'unfulfilled',
	`currency` varchar(16) NOT NULL DEFAULT 'CNY',
	`subtotalAmount` bigint unsigned NOT NULL,
	`discountAmount` bigint unsigned NOT NULL DEFAULT 0,
	`shippingAmount` bigint unsigned NOT NULL DEFAULT 0,
	`payableAmount` bigint unsigned NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNo_unique` UNIQUE(`orderNo`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`orderId` int NOT NULL,
	`paymentNo` varchar(64) NOT NULL,
	`provider` enum('wechat_jsapi','wechat_native','alipay','stripe','offline_bank_transfer') NOT NULL,
	`paymentScenario` enum('full_payment','installment','credit_card','deposit','offline_review') NOT NULL DEFAULT 'full_payment',
	`amount` bigint unsigned NOT NULL,
	`status` enum('created','pending','paid','failed','cancelled','reviewing','refunded') NOT NULL DEFAULT 'created',
	`externalTransactionId` varchar(128),
	`metaJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`paidAt` timestamp,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_paymentNo_unique` UNIQUE(`paymentNo`)
);
--> statement-breakpoint
CREATE TABLE `productCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`parentId` int,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productCategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `productCategories_brand_slug_unique` UNIQUE(`brandId`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `productSkus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`productId` int NOT NULL,
	`skuCode` varchar(100) NOT NULL,
	`specName` varchar(255),
	`packSize` varchar(100),
	`basePrice` bigint unsigned NOT NULL,
	`marketPrice` bigint unsigned,
	`stockQty` int NOT NULL DEFAULT 0,
	`minOrderQty` int NOT NULL DEFAULT 1,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productSkus_id` PRIMARY KEY(`id`),
	CONSTRAINT `productSkus_brand_sku_unique` UNIQUE(`brandId`,`skuCode`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`categoryId` int,
	`productType` enum('physical','service','rental','subscription') NOT NULL DEFAULT 'physical',
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`subtitle` varchar(255),
	`description` text,
	`unit` varchar(64),
	`status` enum('draft','active','inactive','archived') NOT NULL DEFAULT 'draft',
	`seoTitle` varchar(255),
	`seoDescription` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_brand_slug_unique` UNIQUE(`brandId`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `skuTierPrices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`skuId` int NOT NULL,
	`minQty` int NOT NULL,
	`maxQty` int,
	`price` bigint unsigned NOT NULL,
	`customerType` enum('b2b','b2c','all') NOT NULL DEFAULT 'all',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skuTierPrices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`productId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`billingCycle` enum('weekly','monthly','quarterly') NOT NULL DEFAULT 'monthly',
	`deliveryRule` varchar(255),
	`price` bigint unsigned NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptionPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`unionId` varchar(64),
	`mobile` varchar(32),
	`email` varchar(320),
	`name` varchar(255),
	`loginMethod` varchar(64),
	`accountType` enum('personal','enterprise') NOT NULL DEFAULT 'personal',
	`globalRole` enum('user','sales','finance','ops','admin','super_admin') NOT NULL DEFAULT 'user',
	`status` enum('active','disabled','pending') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
