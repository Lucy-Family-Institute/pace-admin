
ALTER TABLE "public"."institutions" ADD CONSTRAINT "institutions_name_key" UNIQUE ("name");
COMMENT ON COLUMN "public"."institutions"."name" IS E'';