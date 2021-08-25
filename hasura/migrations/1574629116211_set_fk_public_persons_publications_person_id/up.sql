

           alter table "public"."persons_publications"
           add constraint "persons_publications_person_id_fkey"
           foreign key ("person_id")
           references "public"."persons"
           ("id") on update no action on delete no action;
      