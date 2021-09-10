
CREATE FUNCTION public.create_data_guid() RETURNS integer
    LANGUAGE sql
    AS $$
	INSERT INTO data(ID) 
    VALUES(DEFAULT)
    returning id;
$$;

ALTER TABLE ONLY "public"."persons" ALTER COLUMN "data_id" SET DEFAULT
      create_data_guid();
ALTER TABLE ONLY "public"."publications" ALTER COLUMN "data_id" SET DEFAULT
      create_data_guid();
ALTER TABLE ONLY "public"."persons_publications" ALTER COLUMN "data_id" SET DEFAULT
      create_data_guid();

-- CREATE TRIGGER create_inital_asset_permissions AFTER INSERT ON public.assets FOR EACH ROW EXECUTE PROCEDURE public.add_asset_group();
