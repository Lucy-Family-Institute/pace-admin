CREATE  INDEX "csl_index" on
  "public"."publications" using gin (csl);
