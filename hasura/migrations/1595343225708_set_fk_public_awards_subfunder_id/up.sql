

           alter table "public"."awards"
           add constraint "awards_subfunder_id_fkey"
           foreign key ("subfunder_id")
           references "public"."subfunders"
           ("id") on update no action on delete restrict;
      