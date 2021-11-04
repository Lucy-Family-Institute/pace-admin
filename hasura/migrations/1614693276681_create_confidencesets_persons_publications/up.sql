
CREATE OR REPLACE VIEW "public"."confidencesets_persons_publications" AS 
 SELECT confidencesets.id,
    confidencesets.persons_publications_id,
    confidencesets.value,
    confidencesets.datetime,
    confidencesets.version,
    persons_publications.person_id,
    persons_publications.publication_id,
    publications.title,
    lower(publications.doi) AS doi,
    publications.source_name,
    publications.year
   FROM confidencesets,
    persons_publications,
    publications
  WHERE ((confidencesets.persons_publications_id = persons_publications.id) AND (persons_publications.publication_id = publications.id));