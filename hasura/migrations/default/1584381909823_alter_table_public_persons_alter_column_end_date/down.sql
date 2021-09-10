
ALTER TABLE "public"."persons" ALTER COLUMN "end_date" TYPE timestamp with time zone;
COMMENT ON COLUMN "public"."persons"."end_date" IS E'null';