CREATE FUNCTION public.utcnow() RETURNS timestamp without time zone
    LANGUAGE sql
    AS $$
  select timezone('utc'::text, now())
$$;
CREATE TABLE public.unit (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.centers_institutes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.centers_institutes_id_seq OWNED BY public.unit.id;
CREATE TABLE public.person_unit (
    id integer NOT NULL,
    person_id integer NOT NULL,
    unit_id integer NOT NULL
);
CREATE SEQUENCE public.creators_centers_institutes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.creators_centers_institutes_id_seq OWNED BY public.person_unit.id;
CREATE TABLE public.person (
    id integer NOT NULL,
    given_name text NOT NULL,
    family_name text NOT NULL,
    email text,
    position_title text,
    institution_id integer,
    provenance_id integer
);
CREATE SEQUENCE public.creators_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.creators_id_seq OWNED BY public.person.id;
CREATE TABLE public.harvest (
    id integer NOT NULL,
    source_name text NOT NULL,
    source_uid text NOT NULL,
    source_response jsonb NOT NULL,
    datetime timestamp with time zone DEFAULT public.utcnow() NOT NULL,
    ingest_id integer
);
CREATE SEQUENCE public.ingest_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.ingest_id_seq OWNED BY public.harvest.id;
CREATE TABLE public.institution (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.institutions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.institutions_id_seq OWNED BY public.institution.id;
CREATE TABLE public.person_publication (
    id integer NOT NULL,
    person_id integer NOT NULL,
    publication_id integer NOT NULL,
    confidence double precision,
    provenance_id integer
);
CREATE SEQUENCE public.persons_publications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.persons_publications_id_seq OWNED BY public.person_publication.id;
CREATE TABLE public.publication (
    id integer NOT NULL,
    title text NOT NULL,
    doi text,
    provenance_id integer
);
CREATE SEQUENCE public.publications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.publications_id_seq OWNED BY public.publication.id;
CREATE TABLE public."user" (
    id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL
);
CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.users_id_seq OWNED BY public."user".id;
ALTER TABLE ONLY public.harvest ALTER COLUMN id SET DEFAULT nextval('public.ingest_id_seq'::regclass);
ALTER TABLE ONLY public.institution ALTER COLUMN id SET DEFAULT nextval('public.institutions_id_seq'::regclass);
ALTER TABLE ONLY public.person ALTER COLUMN id SET DEFAULT nextval('public.creators_id_seq'::regclass);
ALTER TABLE ONLY public.person_publication ALTER COLUMN id SET DEFAULT nextval('public.persons_publications_id_seq'::regclass);
ALTER TABLE ONLY public.person_unit ALTER COLUMN id SET DEFAULT nextval('public.creators_centers_institutes_id_seq'::regclass);
ALTER TABLE ONLY public.publication ALTER COLUMN id SET DEFAULT nextval('public.publications_id_seq'::regclass);
ALTER TABLE ONLY public.unit ALTER COLUMN id SET DEFAULT nextval('public.centers_institutes_id_seq'::regclass);
ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
ALTER TABLE ONLY public.unit
    ADD CONSTRAINT centers_institutes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.person
    ADD CONSTRAINT creators_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.harvest
    ADD CONSTRAINT ingest_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.institution
    ADD CONSTRAINT institutions_name_key UNIQUE (name);
ALTER TABLE ONLY public.institution
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.person_publication
    ADD CONSTRAINT persons_publications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.person_unit
    ADD CONSTRAINT persons_units_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.publication
    ADD CONSTRAINT publications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public."user"
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.person
    ADD CONSTRAINT persons_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institution(id);
ALTER TABLE ONLY public.person_publication
    ADD CONSTRAINT persons_publications_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(id);
ALTER TABLE ONLY public.person_publication
    ADD CONSTRAINT persons_publications_publication_id_fkey FOREIGN KEY (publication_id) REFERENCES public.publication(id);
ALTER TABLE ONLY public.person_unit
    ADD CONSTRAINT persons_units_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(id);
ALTER TABLE ONLY public.person_unit
    ADD CONSTRAINT persons_units_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit(id);
