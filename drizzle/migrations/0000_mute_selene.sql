CREATE TYPE "public"."assignment_status" AS ENUM('assigned', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."po_status" AS ENUM('pending', 'scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."trade" AS ENUM('trim', 'stairs', 'doors');--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"message_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"message_text" text NOT NULL,
	"response_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geographic_locations" (
	"location_id" serial PRIMARY KEY NOT NULL,
	"location_name" varchar(100) NOT NULL,
	"zip_code" varchar(10),
	"city" varchar(100),
	"state" varchar(2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installer_assignments" (
	"assignment_id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer NOT NULL,
	"installer_id" integer NOT NULL,
	"po_id" integer NOT NULL,
	"assignment_status" "assignment_status" DEFAULT 'assigned' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installer_locations" (
	"installer_id" integer NOT NULL,
	"location_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installers" (
	"installer_id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"trade" "trade" NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_schedules" (
	"schedule_id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"scheduled_date" date NOT NULL,
	"status" "schedule_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"job_id" serial PRIMARY KEY NOT NULL,
	"job_number" varchar(50) NOT NULL,
	"street_address" varchar(255) NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(2) NOT NULL,
	"zip_code" varchar(10) NOT NULL,
	"location_id" integer,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_job_number_unique" UNIQUE("job_number")
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"po_id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"po_number" varchar(50) NOT NULL,
	"trim_linear_feet" numeric(10, 2),
	"stair_risers" integer,
	"door_count" integer,
	"status" "po_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
ALTER TABLE "installer_assignments" ADD CONSTRAINT "installer_assignments_schedule_id_job_schedules_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."job_schedules"("schedule_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_assignments" ADD CONSTRAINT "installer_assignments_installer_id_installers_installer_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."installers"("installer_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_assignments" ADD CONSTRAINT "installer_assignments_po_id_purchase_orders_po_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("po_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_locations" ADD CONSTRAINT "installer_locations_installer_id_installers_installer_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."installers"("installer_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_locations" ADD CONSTRAINT "installer_locations_location_id_geographic_locations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."geographic_locations"("location_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_schedules" ADD CONSTRAINT "job_schedules_job_id_jobs_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("job_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_location_id_geographic_locations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."geographic_locations"("location_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_job_id_jobs_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("job_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_messages_created_idx" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "assignments_schedule_idx" ON "installer_assignments" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "assignments_installer_idx" ON "installer_assignments" USING btree ("installer_id");--> statement-breakpoint
CREATE INDEX "assignments_po_idx" ON "installer_assignments" USING btree ("po_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_unique" ON "installer_assignments" USING btree ("schedule_id","installer_id","po_id");--> statement-breakpoint
CREATE INDEX "assignments_availability_idx" ON "installer_assignments" USING btree ("installer_id","schedule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "installer_locations_pk" ON "installer_locations" USING btree ("installer_id","location_id");--> statement-breakpoint
CREATE INDEX "installers_trade_idx" ON "installers" USING btree ("trade");--> statement-breakpoint
CREATE INDEX "installers_active_idx" ON "installers" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_job_date_unique" ON "job_schedules" USING btree ("job_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "schedule_date_idx" ON "job_schedules" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "schedule_job_idx" ON "job_schedules" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "jobs_location_idx" ON "jobs" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jobs_number_idx" ON "jobs" USING btree ("job_number");--> statement-breakpoint
CREATE INDEX "po_job_idx" ON "purchase_orders" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "po_status_idx" ON "purchase_orders" USING btree ("status");