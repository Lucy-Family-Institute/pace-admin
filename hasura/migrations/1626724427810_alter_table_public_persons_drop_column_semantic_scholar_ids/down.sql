
ALTER TABLE "public"."persons" ADD COLUMN "semantic_scholar_ids" jsonb
ALTER TABLE "public"."persons" ALTER COLUMN "semantic_scholar_ids" DROP NOT NULL