
COMMENT ON COLUMN "public"."reviews"."reviewType" IS E'';
alter table "public"."reviews" rename column "reviewType" to "review_type";