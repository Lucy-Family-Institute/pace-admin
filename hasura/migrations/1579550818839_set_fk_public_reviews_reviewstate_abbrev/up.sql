

           alter table "public"."reviews"
           add constraint "reviews_reviewstate_abbrev_fkey"
           foreign key ("reviewstate_abbrev")
           references "public"."reviewstates"
           ("abbrev") on update no action on delete no action;
      