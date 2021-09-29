
ALTER TABLE "public"."persons" ALTER COLUMN "start_date" TYPE timestamp with time zone;
COMMENT ON COLUMN "public"."persons"."start_date" IS E'null';