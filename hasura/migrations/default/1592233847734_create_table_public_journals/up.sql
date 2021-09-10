
CREATE TABLE "public"."journals"("id" serial NOT NULL, "name" text NOT NULL, "publisher" text, "issn" text, "e_issn" text, PRIMARY KEY ("id") , UNIQUE ("id"));