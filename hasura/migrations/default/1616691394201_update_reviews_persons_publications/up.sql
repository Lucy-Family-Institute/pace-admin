
CREATE OR REPLACE VIEW "public"."reviews_persons_publications" AS 
 SELECT reviews.id,
    reviews.user_id,
    reviews.persons_publications_id,
    reviews.datetime,
    reviews.review_organization_value,
    persons_publications.person_id,
    persons_publications.publication_id,
    publications.title,
    lower(publications.doi) AS doi,
    publications.source_name,
    publications.year,
    reviews.review_type
   FROM reviews,
    persons_publications,
    publications
  WHERE ((reviews.persons_publications_id = persons_publications.id) AND (persons_publications.publication_id = publications.id));