
CREATE TABLE "public"."submissions"("id" serial NOT NULL, "type" text NOT NULL, "data" jsonb NOT NULL, "datetime" timestamptz NOT NULL DEFAULT utcnow(), PRIMARY KEY ("id") );