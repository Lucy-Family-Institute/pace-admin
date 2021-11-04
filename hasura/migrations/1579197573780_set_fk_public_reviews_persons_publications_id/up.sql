

           alter table "public"."reviews"
           add constraint "reviews_persons_publications_id_fkey"
           foreign key ("persons_publications_id")
           references "public"."persons_publications"
           ("id") on update no action on delete no action;
      