
COMMENT ON COLUMN "public"."reviews"."reviewOrganization" IS E'';
alter table "public"."reviews" rename column "reviewOrganization" to "review_organization_value";