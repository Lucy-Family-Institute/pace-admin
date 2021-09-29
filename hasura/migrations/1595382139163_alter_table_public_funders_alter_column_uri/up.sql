
ALTER TABLE "public"."funders" ALTER COLUMN "uri" DROP NOT NULL;
COMMENT ON COLUMN "public"."funders"."uri" IS E'';