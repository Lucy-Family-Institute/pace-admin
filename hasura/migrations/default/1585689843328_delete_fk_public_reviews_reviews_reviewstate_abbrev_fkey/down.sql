
alter table "public"."reviews" add foreign key ("reviewstate_abbrev") references "public"."reviewstates"("abbrev") on update no action on delete no action;