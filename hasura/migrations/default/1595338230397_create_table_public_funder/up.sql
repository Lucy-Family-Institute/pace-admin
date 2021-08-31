
CREATE TABLE "public"."funder"("id" serial NOT NULL, "name" text NOT NULL, "short_name" text NOT NULL, "uri" text NOT NULL, PRIMARY KEY ("id") , UNIQUE ("id"));