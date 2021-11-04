
ALTER TABLE "public"."subfunders" ALTER COLUMN "uri" SET NOT NULL;
COMMENT ON COLUMN "public"."subfunders"."uri" IS E'null';