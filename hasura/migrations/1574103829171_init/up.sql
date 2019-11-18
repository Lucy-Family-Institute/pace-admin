CREATE TABLE public.units (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.centers_institutes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.centers_institutes_id_seq OWNED BY public.units.id;
CREATE TABLE public.persons_units (
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
ALTER SEQUENCE public.creators_centers_institutes_id_seq OWNED BY public.persons_units.id;
CREATE TABLE public.persons (
    id integer NOT NULL,
    given_name text NOT NULL,
    family_name text NOT NULL,
    email text,
    position_title text,
    institution_id integer
);
CREATE SEQUENCE public.creators_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.creators_id_seq OWNED BY public.persons.id;
CREATE TABLE public.institutions (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.institutions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.institutions_id_seq OWNED BY public.institutions.id;
ALTER TABLE ONLY public.institutions ALTER COLUMN id SET DEFAULT nextval('public.institutions_id_seq'::regclass);
ALTER TABLE ONLY public.persons ALTER COLUMN id SET DEFAULT nextval('public.creators_id_seq'::regclass);
ALTER TABLE ONLY public.persons_units ALTER COLUMN id SET DEFAULT nextval('public.creators_centers_institutes_id_seq'::regclass);
ALTER TABLE ONLY public.units ALTER COLUMN id SET DEFAULT nextval('public.centers_institutes_id_seq'::regclass);
ALTER TABLE ONLY public.units
    ADD CONSTRAINT centers_institutes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.persons
    ADD CONSTRAINT creators_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.persons_units
    ADD CONSTRAINT persons_units_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id);
ALTER TABLE ONLY public.persons_units
    ADD CONSTRAINT persons_units_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id);
ALTER TABLE ONLY public.persons_units
    ADD CONSTRAINT persons_units_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);
