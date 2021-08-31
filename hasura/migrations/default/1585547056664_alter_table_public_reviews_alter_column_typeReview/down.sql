
COMMENT ON COLUMN "public"."reviews"."typeReview" IS E'null';
alter table "public"."reviews" rename column "reviewType" to "typeReview";