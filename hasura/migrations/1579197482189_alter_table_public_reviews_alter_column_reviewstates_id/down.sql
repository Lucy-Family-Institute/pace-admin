
ALTER TABLE "public"."reviews" ALTER COLUMN "reviewstates_id" TYPE integer;
COMMENT ON COLUMN "public"."reviews"."reviewstates_id" IS E'null';
alter table "public"."reviews" rename column "reviewstate_id" to "reviewstates_id";