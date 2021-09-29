

           alter table "public"."publications"
           add constraint "publications_journal_id_fkey"
           foreign key ("journal_id")
           references "public"."journals"
           ("id") on update no action on delete no action;
      