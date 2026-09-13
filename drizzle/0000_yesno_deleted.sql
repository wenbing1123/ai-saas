CREATE TABLE "biz_api_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"prefix" varchar(24) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_used_at" timestamp with time zone,
	"last_used_ip" varchar(64),
	"request_count" bigint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sys_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"key" varchar(80) NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"amount_cents" bigint NOT NULL,
	"balance_after_cents" bigint NOT NULL,
	"ref_type" varchar(30),
	"ref_id" uuid,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "biz_model" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"provider" varchar(50) NOT NULL,
	"protocol" varchar(20) DEFAULT 'openai' NOT NULL,
	"model_id" varchar(100) NOT NULL,
	"upstream_model" varchar(100) NOT NULL,
	"base_url" text,
	"display_name" varchar(150) NOT NULL,
	"context_window" integer DEFAULT 0 NOT NULL,
	"max_output_tokens" integer DEFAULT 0 NOT NULL,
	"supports_vision" boolean DEFAULT false NOT NULL,
	"supports_tools" boolean DEFAULT true NOT NULL,
	"supports_reasoning" boolean DEFAULT false NOT NULL,
	"input_cost_per_1m" numeric(12, 6) DEFAULT '0' NOT NULL,
	"output_cost_per_1m" numeric(12, 6) DEFAULT '0' NOT NULL,
	"cache_read_cost_per_1m" numeric(12, 6) DEFAULT '0' NOT NULL,
	"cache_write_cost_per_1m" numeric(12, 6) DEFAULT '0' NOT NULL,
	"retail_input_per_1m" numeric(12, 6) DEFAULT '0' NOT NULL,
	"retail_output_per_1m" numeric(12, 6) DEFAULT '0' NOT NULL,
	"markup_percent" numeric(6, 2) DEFAULT '20' NOT NULL,
	"sell_input_per_1m" numeric(12, 6) DEFAULT '0' NOT NULL,
	"sell_output_per_1m" numeric(12, 6) DEFAULT '0' NOT NULL,
	"sell_cache_read_per_1m" numeric(12, 6) DEFAULT '0' NOT NULL,
	"sell_cache_write_per_1m" numeric(12, 6) DEFAULT '0' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	CONSTRAINT "biz_model_sell_input_ge_cost" CHECK ("biz_model"."sell_input_per_1m" >= "biz_model"."input_cost_per_1m"),
	CONSTRAINT "biz_model_sell_output_ge_cost" CHECK ("biz_model"."sell_output_per_1m" >= "biz_model"."output_cost_per_1m"),
	CONSTRAINT "biz_model_sell_cache_read_ge_cost" CHECK ("biz_model"."sell_cache_read_per_1m" >= "biz_model"."cache_read_cost_per_1m"),
	CONSTRAINT "biz_model_sell_cache_write_ge_cost" CHECK ("biz_model"."sell_cache_write_per_1m" >= "biz_model"."cache_write_cost_per_1m"),
	CONSTRAINT "biz_model_markup_non_negative" CHECK ("biz_model"."markup_percent" >= 0)
);
--> statement-breakpoint
CREATE TABLE "biz_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"order_no" varchar(40) NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"credit_cents" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payment_channel" varchar(30) DEFAULT 'manual' NOT NULL,
	"payment_ref" varchar(255),
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sys_permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"module" varchar(50) NOT NULL,
	"type" varchar(20) DEFAULT 'action' NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biz_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"price_cents" bigint NOT NULL,
	"credit_cents" bigint NOT NULL,
	"valid_days" integer DEFAULT 30 NOT NULL,
	"rate_limit_rpm" integer DEFAULT 60 NOT NULL,
	"max_concurrency" integer DEFAULT 5 NOT NULL,
	"allowed_model_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"highlighted" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	CONSTRAINT "biz_plan_price_positive" CHECK ("biz_plan"."price_cents" > 0),
	CONSTRAINT "biz_plan_credit_positive" CHECK ("biz_plan"."credit_cents" > 0),
	CONSTRAINT "biz_plan_valid_days_positive" CHECK ("biz_plan"."valid_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "sys_role_permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biz_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"rate_limit_rpm" integer NOT NULL,
	"max_concurrency" integer NOT NULL,
	"allowed_model_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expire_at" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_usage_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"user_id" uuid NOT NULL,
	"token_id" uuid,
	"model_id" varchar(100) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"request_id" varchar(80),
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_write_tokens" integer DEFAULT 0 NOT NULL,
	"cost_cents" numeric(12, 4) DEFAULT '0' NOT NULL,
	"charge_cents" numeric(12, 4) DEFAULT '0' NOT NULL,
	"debit_cents" bigint DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"status_code" integer,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "sys_user_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"balance_cents" bigint DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"package_expire_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "biz_api_token" ADD CONSTRAINT "biz_api_token_user_id_sys_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sys_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_credit_ledger" ADD CONSTRAINT "bill_credit_ledger_user_id_sys_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sys_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biz_order" ADD CONSTRAINT "biz_order_user_id_sys_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sys_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biz_order" ADD CONSTRAINT "biz_order_plan_id_biz_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."biz_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_role_permission" ADD CONSTRAINT "sys_role_permission_role_id_sys_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."sys_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_role_permission" ADD CONSTRAINT "sys_role_permission_permission_id_sys_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."sys_permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biz_subscription" ADD CONSTRAINT "biz_subscription_user_id_sys_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sys_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biz_subscription" ADD CONSTRAINT "biz_subscription_plan_id_biz_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."biz_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biz_subscription" ADD CONSTRAINT "biz_subscription_order_id_biz_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."biz_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_usage_record" ADD CONSTRAINT "bill_usage_record_user_id_sys_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sys_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_usage_record" ADD CONSTRAINT "bill_usage_record_token_id_biz_api_token_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."biz_api_token"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_user_role" ADD CONSTRAINT "sys_user_role_user_id_sys_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sys_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_user_role" ADD CONSTRAINT "sys_user_role_role_id_sys_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."sys_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "biz_api_token_hash_unique" ON "biz_api_token" USING btree ("key_hash") WHERE "biz_api_token"."deleted" = 0;--> statement-breakpoint
CREATE INDEX "biz_api_token_user_idx" ON "biz_api_token" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sys_setting_key_unique" ON "sys_setting" USING btree ("key") WHERE "sys_setting"."deleted" = 0;--> statement-breakpoint
CREATE INDEX "bill_credit_ledger_user_idx" ON "bill_credit_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "bill_credit_ledger_type_idx" ON "bill_credit_ledger" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "biz_model_model_id_unique" ON "biz_model" USING btree ("model_id") WHERE "biz_model"."deleted" = 0;--> statement-breakpoint
CREATE INDEX "biz_model_provider_idx" ON "biz_model" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "biz_model_enabled_idx" ON "biz_model" USING btree ("enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "biz_order_no_unique" ON "biz_order" USING btree ("order_no") WHERE "biz_order"."deleted" = 0;--> statement-breakpoint
CREATE INDEX "biz_order_user_idx" ON "biz_order" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "biz_order_status_idx" ON "biz_order" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "sys_permission_code_unique" ON "sys_permission" USING btree ("code") WHERE "sys_permission"."deleted" = 0;--> statement-breakpoint
CREATE INDEX "sys_permission_module_idx" ON "sys_permission" USING btree ("module");--> statement-breakpoint
CREATE UNIQUE INDEX "biz_plan_slug_unique" ON "biz_plan" USING btree ("slug") WHERE "biz_plan"."deleted" = 0;--> statement-breakpoint
CREATE INDEX "biz_plan_active_idx" ON "biz_plan" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "sys_role_permission_pair_unique" ON "sys_role_permission" USING btree ("role_id","permission_id") WHERE "sys_role_permission"."deleted" = 0;--> statement-breakpoint
CREATE INDEX "sys_role_permission_perm_idx" ON "sys_role_permission" USING btree ("permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sys_role_code_unique" ON "sys_role" USING btree ("code") WHERE "sys_role"."deleted" = 0;--> statement-breakpoint
CREATE INDEX "biz_subscription_user_idx" ON "biz_subscription" USING btree ("user_id","expire_at");--> statement-breakpoint
CREATE INDEX "bill_usage_user_created_idx" ON "bill_usage_record" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "bill_usage_model_created_idx" ON "bill_usage_record" USING btree ("model_id","created_at");--> statement-breakpoint
CREATE INDEX "bill_usage_created_idx" ON "bill_usage_record" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sys_user_role_pair_unique" ON "sys_user_role" USING btree ("user_id","role_id") WHERE "sys_user_role"."deleted" = 0;--> statement-breakpoint
CREATE INDEX "sys_user_role_role_idx" ON "sys_user_role" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sys_user_email_unique" ON "sys_user" USING btree ("email") WHERE "sys_user"."deleted" = 0;--> statement-breakpoint
CREATE INDEX "sys_user_status_idx" ON "sys_user" USING btree ("status");