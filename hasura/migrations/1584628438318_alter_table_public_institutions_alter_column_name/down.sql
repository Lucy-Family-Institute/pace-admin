
ALTER TABLE "public"."institutions" DROP CONSTRAINT "institutions_name_key";
COMMENT ON COLUMN "public"."institutions"."name" IS E'null';