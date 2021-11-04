
COMMENT ON COLUMN "public"."users"."email" IS E'';
alter table "public"."users" rename column "email" to "primaryEmail";