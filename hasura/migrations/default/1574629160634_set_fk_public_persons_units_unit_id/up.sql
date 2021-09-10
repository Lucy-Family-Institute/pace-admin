

           alter table "public"."persons_units"
           add constraint "persons_units_unit_id_fkey"
           foreign key ("unit_id")
           references "public"."units"
           ("id") on update no action on delete no action;
      