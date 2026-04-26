-- Fix post_reports reason check: lowercase values + add 'harassment'
ALTER TABLE "post_reports" DROP CONSTRAINT IF EXISTS "post_reports_reason_check";
--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reason_check" CHECK ("post_reports"."reason" IN ('spam', 'inappropriate', 'misinformation', 'harassment', 'other'));
--> statement-breakpoint
-- Seed admin_settings with auto_hide_report_threshold
INSERT INTO "admin_settings" ("key", "value") VALUES ('auto_hide_report_threshold', '10') ON CONFLICT DO NOTHING;
