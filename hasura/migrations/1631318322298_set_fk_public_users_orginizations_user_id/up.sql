alter table "public"."users_organizations"
  add constraint "users_organizations_user_id_fkey"
  foreign key ("user_id")
  references "public"."users"
  ("id") on update no action on delete no action;
