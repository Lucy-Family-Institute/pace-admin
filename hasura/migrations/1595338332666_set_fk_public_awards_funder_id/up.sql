

           alter table "public"."awards"
           add constraint "awards_funder_id_fkey"
           foreign key ("funder_id")
           references "public"."funder"
           ("id") on update no action on delete restrict;
      