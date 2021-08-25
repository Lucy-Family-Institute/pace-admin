
ALTER TABLE "public"."reviews" ALTER COLUMN "reviewstates_id" TYPE int4;
COMMENT ON COLUMN "public"."reviews"."reviewstates_id" IS E'';
alter table "public"."reviews" rename column "reviewstates_id" to "reviewstate_id";