

           alter table "public"."reviews"
           add constraint "reviews_reviewstate_id_fkey"
           foreign key ("reviewstate_id")
           references "public"."reviewstates"
           ("id") on update no action on delete no action;
      