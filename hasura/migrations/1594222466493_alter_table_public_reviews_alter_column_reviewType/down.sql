
COMMENT ON COLUMN "public"."reviews"."reviewType" IS E'null';
alter table "public"."reviews" rename column "review_type" to "reviewType";