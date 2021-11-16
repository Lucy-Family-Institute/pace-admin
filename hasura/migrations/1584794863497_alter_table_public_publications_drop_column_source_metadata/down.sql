w
ALTER TABLE "public"."publications" ADD COLUMN "source_metadata" text
ALTER TABLE "public"."publications" ALTER COLUMN "source_metadata" DROP NOT NULL