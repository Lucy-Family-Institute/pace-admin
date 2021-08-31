
ALTER TABLE "public"."reviews" ADD COLUMN "reviewstate_abbrev" text
ALTER TABLE "public"."reviews" ALTER COLUMN "reviewstate_abbrev" DROP NOT NULL