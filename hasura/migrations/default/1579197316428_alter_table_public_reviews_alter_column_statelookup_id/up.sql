
ALTER TABLE "public"."reviews" ALTER COLUMN "statelookup_id" TYPE int4;
COMMENT ON COLUMN "public"."reviews"."statelookup_id" IS E'';
alter table "public"."reviews" rename column "statelookup_id" to "reviewstates_id";