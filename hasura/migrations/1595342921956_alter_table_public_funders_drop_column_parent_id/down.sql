
ALTER TABLE "public"."funders" ADD COLUMN "parent_id" int4
ALTER TABLE "public"."funders" ALTER COLUMN "parent_id" DROP NOT NULL