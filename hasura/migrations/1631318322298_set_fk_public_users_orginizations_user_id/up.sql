alter table "public"."users_orginizations"
  add constraint "users_orginizations_user_id_fkey"
  foreign key ("user_id")
  references "public"."users"
  ("id") on update no action on delete no action;
