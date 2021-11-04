
ALTER TABLE "public"."reviews" ADD COLUMN "reviewstate_id" int4
ALTER TABLE "public"."reviews" ALTER COLUMN "reviewstate_id" DROP NOT NULL