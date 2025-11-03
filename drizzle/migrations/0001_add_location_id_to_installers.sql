ALTER TABLE "installers" ADD COLUMN "location_id" integer;--> statement-breakpoint
ALTER TABLE "installers" ADD CONSTRAINT "installers_location_id_geographic_locations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."geographic_locations"("location_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "installers_location_idx" ON "installers" USING btree ("location_id");
