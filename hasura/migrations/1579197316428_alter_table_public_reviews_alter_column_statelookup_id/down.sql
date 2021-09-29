
ALTER TABLE "public"."reviews" ALTER COLUMN "statelookup_id" TYPE integer;
COMMENT ON COLUMN "public"."reviews"."statelookup_id" IS E'null';
alter table "public"."reviews" rename column "reviewstates_id" to "statelookup_id";