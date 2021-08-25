
ALTER TABLE "public"."type_review" ALTER COLUMN "comment" DROP NOT NULL;
COMMENT ON COLUMN "public"."type_review"."comment" IS E'';