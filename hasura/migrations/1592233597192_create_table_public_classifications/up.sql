
CREATE TABLE "public"."classifications"("id" serial NOT NULL, "name" text NOT NULL, "identifier" text NOT NULL, "scheme" text NOT NULL, PRIMARY KEY ("id") , UNIQUE ("id"));