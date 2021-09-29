
ALTER TABLE "public"."persons" ALTER COLUMN "start_date" TYPE timestamp with time zone;
ALTER TABLE "public"."persons" ALTER COLUMN "start_date" SET DEFAULT now();
COMMENT ON COLUMN "public"."persons"."start_date" IS E'null';