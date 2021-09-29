

           alter table "public"."reviews"
           add constraint "reviews_review_organization_value_fkey"
           foreign key ("review_organization_value")
           references "public"."review_organization"
           ("value") on update no action on delete no action;
      