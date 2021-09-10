
ALTER TABLE "public"."type_review" ALTER COLUMN "comment" SET NOT NULL;
COMMENT ON COLUMN "public"."type_review"."comment" IS E'null';