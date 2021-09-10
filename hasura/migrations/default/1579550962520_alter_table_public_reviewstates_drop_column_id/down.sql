
ALTER TABLE "public"."reviewstates" ADD COLUMN "id" int4
ALTER TABLE "public"."reviewstates" ALTER COLUMN "id" DROP NOT NULL
ALTER TABLE "public"."reviewstates" ALTER COLUMN "id" SET DEFAULT nextval('statelookup_id_seq'::regclass)