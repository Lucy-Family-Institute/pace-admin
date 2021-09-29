
ALTER TABLE "public"."awards" ALTER COLUMN "funder_award_identifier" DROP NOT NULL;
COMMENT ON COLUMN "public"."awards"."funder_award_identifier" IS E'';