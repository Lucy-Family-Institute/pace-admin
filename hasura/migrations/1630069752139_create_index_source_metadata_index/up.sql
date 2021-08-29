CREATE  INDEX "source_metadata_index" on
  "public"."publications" using gin (source_metadata);
