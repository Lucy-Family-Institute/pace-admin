
CREATE TABLE "public"."confidence_type"("id" serial NOT NULL, "name" text NOT NULL, "description" text NOT NULL, "rank" integer NOT NULL, PRIMARY KEY ("id") , UNIQUE ("id"), UNIQUE ("name"));