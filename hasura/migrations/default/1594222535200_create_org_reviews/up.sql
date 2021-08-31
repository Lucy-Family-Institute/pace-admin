
CREATE VIEW org_reviews AS SELECT
    reviews.id,
    reviews.user_id,
    reviews.persons_publications_id,
    reviews.datetime,
    reviews.review_type,
    reviews.review_organization_value
FROM reviews