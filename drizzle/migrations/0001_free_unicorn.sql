DROP INDEX "idx_documents_expiry_date";--> statement-breakpoint
DROP INDEX "idx_notifications_unread";--> statement-breakpoint
DROP INDEX "idx_posts_score";--> statement-breakpoint
DROP INDEX "idx_posts_created_at";--> statement-breakpoint
DROP INDEX "idx_posts_tags";--> statement-breakpoint
CREATE INDEX "idx_documents_expiry_date" ON "documents" USING btree ("expiry_date") WHERE "documents"."expiry_date" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_notifications_unread" ON "notifications" USING btree ("user_id","is_read") WHERE "notifications"."is_read" = false;--> statement-breakpoint
CREATE INDEX "idx_posts_score" ON "posts" USING btree ("score" DESC NULLS LAST) WHERE "posts"."is_hidden" = false;--> statement-breakpoint
CREATE INDEX "idx_posts_created_at" ON "posts" USING btree ("created_at" DESC NULLS LAST) WHERE "posts"."is_hidden" = false;--> statement-breakpoint
CREATE INDEX "idx_posts_tags" ON "posts" USING gin ("tags");