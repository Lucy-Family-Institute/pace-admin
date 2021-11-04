
ALTER TABLE "public"."subfunders" ALTER COLUMN "uri" DROP NOT NULL;
COMMENT ON COLUMN "public"."subfunders"."uri" IS E'';