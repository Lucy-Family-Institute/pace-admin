

           alter table "public"."reviews"
           add constraint "reviews_reviewType_fkey"
           foreign key ("reviewType")
           references "public"."type_review"
           ("value") on update restrict on delete restrict;
      