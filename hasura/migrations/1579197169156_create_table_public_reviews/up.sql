
CREATE TABLE "public"."reviews"("id" serial NOT NULL, "user_id" integer NOT NULL, "persons_publications_id" integer NOT NULL, "statelookup_id" integer NOT NULL, "datetime" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , UNIQUE ("id"));