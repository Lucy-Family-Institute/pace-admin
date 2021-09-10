

           alter table "public"."persons_publications"
           add constraint "persons_publications_data_id_fkey"
           foreign key ("data_id")
           references "public"."data"
           ("id") on update no action on delete no action;
      