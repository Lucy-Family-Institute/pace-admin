
ALTER TABLE "public"."journals" ADD CONSTRAINT "journals_title_key" UNIQUE ("title");
COMMENT ON COLUMN "public"."journals"."title" IS E'null';