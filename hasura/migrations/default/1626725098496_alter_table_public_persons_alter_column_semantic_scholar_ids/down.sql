
ALTER TABLE "public"."persons" ALTER COLUMN "semantic_scholar_ids" TYPE ARRAY;
COMMENT ON COLUMN "public"."persons"."semantic_scholar_ids" IS E'null';