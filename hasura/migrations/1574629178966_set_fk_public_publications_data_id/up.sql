

           alter table "public"."publications"
           add constraint "publications_data_id_fkey"
           foreign key ("data_id")
           references "public"."data"
           ("id") on update no action on delete no action;
      