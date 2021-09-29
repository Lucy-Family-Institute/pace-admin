
ALTER TABLE "public"."journals" DROP CONSTRAINT "journals_title_key";
COMMENT ON COLUMN "public"."journals"."title" IS E'null';