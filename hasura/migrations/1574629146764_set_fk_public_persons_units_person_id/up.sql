

           alter table "public"."persons_units"
           add constraint "persons_units_person_id_fkey"
           foreign key ("person_id")
           references "public"."persons"
           ("id") on update no action on delete no action;
      