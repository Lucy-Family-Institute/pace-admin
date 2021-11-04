
COMMENT ON COLUMN "public"."users"."email" IS E'null';
alter table "public"."users" rename column "primaryEmail" to "email";