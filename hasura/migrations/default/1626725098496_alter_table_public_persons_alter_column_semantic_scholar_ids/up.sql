
ALTER TABLE "public"."persons" ALTER COLUMN "semantic_scholar_ids" TYPE text;
COMMENT ON COLUMN "public"."persons"."semantic_scholar_ids" IS E'';