
COMMENT ON COLUMN "public"."journals"."name" IS E'null';
alter table "public"."journals" rename column "title" to "name";