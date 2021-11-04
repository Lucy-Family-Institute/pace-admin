
CREATE OR REPLACE VIEW "public"."persons_publications_metadata" AS 
 SELECT persons_publications.id,
    persons_publications.person_id,
    persons_publications.publication_id,
    persons_publications.confidence,
    publications.title,
    lower(publications.doi) as doi,
    publications.source_name,
    publications.year
   FROM persons_publications,
    publications
  WHERE (persons_publications.publication_id = publications.id);