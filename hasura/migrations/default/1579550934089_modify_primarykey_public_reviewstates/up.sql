
alter table "public"."reviewstates" drop constraint "statelookup_pkey";
alter table "public"."reviewstates"
    add constraint "reviewstates_pkey" 
    primary key ( "abbrev" );