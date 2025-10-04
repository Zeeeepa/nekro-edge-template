CREATE TABLE `api_calls` (
	`id` integer PRIMARY KEY NOT NULL,
	`provider_id` integer,
	`input_format` text NOT NULL,
	`output_format` text NOT NULL,
	`model` text,
	`endpoint` text,
	`request_tokens` integer,
	`response_tokens` integer,
	`total_tokens` integer,
	`response_time` integer,
	`success` integer NOT NULL,
	`error_message` text,
	`error_code` text,
	`user_agent` text,
	`client_ip` text,
	`request_id` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `api_calls_provider_idx` ON `api_calls` (`provider_id`);--> statement-breakpoint
CREATE INDEX `api_calls_format_idx` ON `api_calls` (`input_format`);--> statement-breakpoint
CREATE INDEX `api_calls_timestamp_idx` ON `api_calls` (`created_at`);--> statement-breakpoint
CREATE INDEX `api_calls_success_idx` ON `api_calls` (`success`);--> statement-breakpoint
CREATE TABLE `load_balancing_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`strategy` text DEFAULT 'weighted',
	`health_weight` real DEFAULT 0.4,
	`response_time_weight` real DEFAULT 0.3,
	`success_rate_weight` real DEFAULT 0.3,
	`max_retries` integer DEFAULT 3,
	`retry_delay` integer DEFAULT 1000,
	`circuit_breaker_threshold` integer DEFAULT 5,
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`type` text NOT NULL,
	`enabled` integer DEFAULT true,
	`priority` integer DEFAULT 1,
	`base_url` text NOT NULL,
	`login_url` text,
	`chat_url` text,
	`api_endpoint` text,
	`email` text,
	`password` text,
	`api_key` text,
	`session_cookies` text,
	`success_rate` real DEFAULT 1,
	`avg_response_time` integer DEFAULT 1000,
	`last_health_check` integer,
	`health_status` text DEFAULT 'unknown',
	`rate_limit` integer DEFAULT 100,
	`daily_limit` integer DEFAULT 1000,
	`current_usage` integer DEFAULT 0,
	`proxy_endpoints` text,
	`use_proxy` integer DEFAULT true,
	`automation_enabled` integer DEFAULT false,
	`login_instructions` text,
	`chat_instructions` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX `providers_enabled_idx` ON `providers` (`enabled`);--> statement-breakpoint
CREATE INDEX `providers_priority_idx` ON `providers` (`priority`);--> statement-breakpoint
CREATE UNIQUE INDEX `providers_name_idx` ON `providers` (`name`);--> statement-breakpoint
CREATE TABLE `proxy_endpoints` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`is_active` integer DEFAULT true,
	`last_checked` integer,
	`response_time` integer,
	`success_rate` real DEFAULT 1,
	`total_requests` integer DEFAULT 0,
	`successful_requests` integer DEFAULT 0,
	`worker_id` text,
	`worker_url` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX `proxy_endpoints_active_idx` ON `proxy_endpoints` (`is_active`);--> statement-breakpoint
CREATE UNIQUE INDEX `proxy_endpoints_name_idx` ON `proxy_endpoints` (`name`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`provider_id` integer,
	`cookies` text,
	`auth_tokens` text,
	`user_agent` text,
	`is_active` integer DEFAULT true,
	`last_used` integer DEFAULT (unixepoch()),
	`expires_at` integer,
	`browser_session_id` text,
	`automation_data` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_provider_idx` ON `sessions` (`provider_id`);--> statement-breakpoint
CREATE INDEX `sessions_active_idx` ON `sessions` (`is_active`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_session_idx` ON `sessions` (`session_id`);--> statement-breakpoint
CREATE TABLE `system_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'general',
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX `system_config_category_idx` ON `system_config` (`category`);--> statement-breakpoint
CREATE UNIQUE INDEX `system_config_key_idx` ON `system_config` (`key`);