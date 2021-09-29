
CREATE TABLE "public"."statelookup"("id" serial NOT NULL, "abbrev" text NOT NULL, "name" text NOT NULL, PRIMARY KEY ("id") , UNIQUE ("id"), UNIQUE ("abbrev"));