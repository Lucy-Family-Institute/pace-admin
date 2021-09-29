CREATE FUNCTION public.utcnow() RETURNS timestamp without time zone
    LANGUAGE sql
    AS $$
  select timezone('utc'::text, now())
$$;
CREATE TABLE public.units (
    id SERIAL,
    name text NOT NULL,
    PRIMARY KEY (id)
);
CREATE TABLE public.persons_units (
    id SERIAL,
    person_id integer NOT NULL,
    unit_id integer NOT NULL,
    PRIMARY KEY (id)
);
CREATE TABLE public.persons (
    id SERIAL,
    given_name text NOT NULL,
    family_name text NOT NULL,
    email text,
    position_title text,
    institution_id integer,
    provenance_id integer,
    data_id integer,
    PRIMARY KEY (id)
);
CREATE TABLE public.data (
    id SERIAL,
    PRIMARY KEY (id)
);
CREATE TABLE public.harvests (
    id SERIAL,
    source_name text NOT NULL,
    source_uid text NOT NULL,
    source_response jsonb NOT NULL,
    datetime timestamp with time zone DEFAULT public.utcnow() NOT NULL,
    ingest_id integer,
    PRIMARY KEY (id)
);
CREATE TABLE public.institutions (
    id SERIAL,
    name text NOT NULL,
    PRIMARY KEY (id)
);
CREATE TABLE public.persons_publications (
    id SERIAL,
    person_id integer NOT NULL,
    publication_id integer NOT NULL,
    confidence double precision,
    provenance_id integer,
    data_id integer,
    PRIMARY KEY (id)
);
CREATE TABLE public.publications (
    id SERIAL,
    title text NOT NULL,
    doi text,
    provenance_id integer,
    data_id integer,
    PRIMARY KEY (id)
);
CREATE TABLE public.users (
    id SERIAL,
    username text NOT NULL,
    email text NOT NULL,
    PRIMARY KEY (id)
);