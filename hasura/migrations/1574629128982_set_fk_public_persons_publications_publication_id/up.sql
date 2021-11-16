

           alter table "public"."persons_publications"
           add constraint "persons_publications_publication_id_fkey"
           foreign key ("publication_id")
           references "public"."publications"
           ("id") on update no action on delete no action;
      