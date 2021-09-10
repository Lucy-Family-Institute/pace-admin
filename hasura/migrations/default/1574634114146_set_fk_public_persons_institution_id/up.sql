

           alter table "public"."persons"
           add constraint "persons_institution_id_fkey"
           foreign key ("institution_id")
           references "public"."institutions"
           ("id") on update no action on delete no action;
      