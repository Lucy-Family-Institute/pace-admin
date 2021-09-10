
ALTER TABLE "public"."persons" ALTER COLUMN "start_date" TYPE timestamptz;
ALTER TABLE "public"."persons" ALTER COLUMN "start_date" DROP DEFAULT;
COMMENT ON COLUMN "public"."persons"."start_date" IS E'';