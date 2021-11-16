
COMMENT ON COLUMN "public"."reviews"."reviewOrganization" IS E'null';
alter table "public"."reviews" rename column "review_organization_value" to "reviewOrganization";