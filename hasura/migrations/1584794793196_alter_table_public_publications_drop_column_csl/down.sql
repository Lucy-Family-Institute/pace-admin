
ALTER TABLE "public"."publications" ADD COLUMN "csl" text
ALTER TABLE "public"."publications" ALTER COLUMN "csl" DROP NOT NULL