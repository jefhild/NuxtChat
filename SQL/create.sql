-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.user_looking_for CASCADE;
DROP TABLE IF EXISTS public.user_ai_interactions CASCADE;
DROP TABLE IF EXISTS public.blocked_users CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.looking_for CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.presence CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.states CASCADE;
DROP TABLE IF EXISTS public.subregions CASCADE;
DROP TABLE IF EXISTS public.status CASCADE;
DROP TABLE IF EXISTS public.sex CASCADE;
DROP TABLE IF EXISTS public.regions CASCADE;
DROP TABLE IF EXISTS public.genders CASCADE;
DROP TABLE IF EXISTS public.user_descriptions CASCADE;
DROP TABLE IF EXISTS public.descriptions CASCADE;
DROP TABLE IF EXISTS public.countries CASCADE;
DROP TABLE IF EXISTS public.cities CASCADE;

-- Table for storing city information
CREATE TABLE public.cities (
  id BIGINT NOT NULL,
  name TEXT NULL,
  state_id BIGINT NULL,
  state_code TEXT NULL,
  state_name TEXT NULL,
  country_id BIGINT NULL,
  country_code TEXT NULL,
  country_name TEXT NULL,
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  "wikiDataId" TEXT NULL,
  CONSTRAINT cities_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Table for storing country information
CREATE TABLE public.countries (
  id BIGINT NOT NULL,
  name TEXT NULL,
  iso3 TEXT NULL,
  iso2 TEXT NULL,
  numeric_code BIGINT NULL,
  phone_code TEXT NULL,
  capital TEXT NULL,
  currency TEXT NULL,
  currency_name TEXT NULL,
  currency_symbol TEXT NULL,
  tld TEXT NULL,
  native TEXT NULL,
  region TEXT NULL,
  region_id BIGINT NULL,
  subregion TEXT NULL,
  subregion_id BIGINT NULL,
  nationality TEXT NULL,
  timezones TEXT NULL,
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  emoji TEXT NULL,
  "emojiU" TEXT NULL,
  CONSTRAINT countries_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Table for storing descriptions
CREATE TABLE public.descriptions (
  id INTEGER NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NULL,
  tooltip TEXT NULL,
  color TEXT NULL,
  CONSTRAINT descriptions_pkey PRIMARY KEY (id),
  CONSTRAINT descriptions_name_key UNIQUE (name)
) TABLESPACE pg_default;

-- Table for linking users to descriptions
CREATE TABLE public.user_descriptions (
  user_id UUID NOT NULL,
  descriptions_id INTEGER NOT NULL,
  CONSTRAINT user_descriptions_pkey PRIMARY KEY (user_id, descriptions_id),
  CONSTRAINT user_descriptions_descriptions_id_fkey FOREIGN KEY (descriptions_id) REFERENCES descriptions (id),
  CONSTRAINT user_descriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Table for storing gender information
CREATE TABLE public.genders (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  name TEXT NULL,
  CONSTRAINT genders_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Table for storing region information
CREATE TABLE public.regions (
  id BIGINT NOT NULL,
  name TEXT NULL,
  "wikiDataId" TEXT NULL,
  CONSTRAINT regions_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Table for storing sex information
CREATE TABLE public.sex (
  id SERIAL NOT NULL,
  gender CHARACTER VARYING(50) NOT NULL,
  CONSTRAINT sex_pkey PRIMARY KEY (id),
  CONSTRAINT sex_gender_key UNIQUE (gender)
) TABLESPACE pg_default;

-- Table for storing statuses
CREATE TABLE public.status (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NULL,
  icon TEXT NULL,
  CONSTRAINT status_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Table for storing subregions
CREATE TABLE public.subregions (
  id BIGINT NOT NULL,
  name TEXT NULL,
  region_id BIGINT NULL,
  "wikiDataId" TEXT NULL,
  CONSTRAINT subregions_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Table for storing state information
CREATE TABLE public.states (
  id BIGINT NOT NULL,
  name TEXT NULL,
  country_id BIGINT NULL,
  country_code TEXT NULL,
  country_name TEXT NULL,
  state_code TEXT NULL,
  type TEXT NULL,
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  CONSTRAINT states_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Table for storing user profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NULL,
  username TEXT NULL,
  bio TEXT NULL,
  age INTEGER NULL,
  gender_id INTEGER NULL,
  displayname TEXT NULL,
  region_id INTEGER NULL,
  subregion_id INTEGER NULL,
  country_id INTEGER NULL,
  state_id INTEGER NULL,
  city_id INTEGER NULL,
  avatar_url TEXT NULL,
  provider TEXT NULL,
  tagline TEXT NULL,
  upvotes_count INTEGER NULL DEFAULT 0,
  downvotes_count INTEGER NULL DEFAULT 0,
  ip TEXT NULL,
  site_url TEXT NULL,
  status_id INTEGER NULL,
  created TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  is_ai BOOLEAN NULL DEFAULT false,
  avatar_decoration_url TEXT NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT unique_user_id UNIQUE (user_id),
  CONSTRAINT profiles_displayname_key UNIQUE (displayname),
  CONSTRAINT fk_state FOREIGN KEY (state_id) REFERENCES states (id),
  CONSTRAINT fk_subregion FOREIGN KEY (subregion_id) REFERENCES subregions (id),
  CONSTRAINT fk_city FOREIGN KEY (city_id) REFERENCES cities (id),
  CONSTRAINT profiles_gender_id_fkey1 FOREIGN KEY (gender_id) REFERENCES genders (id),
  CONSTRAINT fk_country FOREIGN KEY (country_id) REFERENCES countries (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT fk_region FOREIGN KEY (region_id) REFERENCES regions (id)
) TABLESPACE pg_default;

-- Table for storing user presence
create table public.presence (
  user_id uuid not null,
  status text null,
  last_active timestamp without time zone null,
  constraint presence_pkey primary key (user_id),
  constraint presence_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Table for storing user messages
create table public.messages (
  id uuid not null default extensions.uuid_generate_v4 (),
  sender_id uuid null,
  receiver_id uuid null,
  content text null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  read boolean null default false,
  constraint messages_pkey primary key (id),
  constraint messages_receiver_id_fkey foreign KEY (receiver_id) references profiles (user_id) on delete CASCADE,
  constraint messages_sender_id_fkey foreign KEY (sender_id) references profiles (user_id) on delete CASCADE
) TABLESPACE pg_default;

-- Table for storing different looking for options
create table public.looking_for (
  id serial not null,
  name text not null,
  icon text null,
  tooltip text null,
  color text null,
  constraint looking_for_pkey primary key (id),
  constraint looking_for_name_key unique (name)
) TABLESPACE pg_default;

-- Table for storing user favorites
create table public.favorites (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  favorite_user_id uuid not null,
  created_at timestamp without time zone null default now(),
  constraint favorites_pkey primary key (id),
  constraint favorites_favorite_user_id_fkey foreign KEY (favorite_user_id) references profiles (user_id),
  constraint favorites_user_id_fkey foreign KEY (user_id) references profiles (user_id)
) TABLESPACE pg_default;

-- Table for storing blocked users
create table public.blocked_users (
  id serial not null,
  user_id uuid null,
  blocked_user_id uuid null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint blocked_users_pkey primary key (id),
  constraint blocked_users_blocked_user_id_fkey foreign KEY (blocked_user_id) references auth.users (id) on delete CASCADE,
  constraint blocked_users_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Table for storing user ai interactions
create table public.user_ai_interactions (
  id bigint generated by default as identity not null,
  user_id uuid null default auth.uid (),
  interaction_count integer null default 0,
  token_count integer null default 0,
  created_at timestamp with time zone not null default now(),
  constraint user_ai_interactions_pkey primary key (id),
  constraint user_ai_interactions_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

-- Table for storing user looking for
create table public.user_looking_for (
  user_id uuid not null,
  looking_for_id integer not null,
  constraint user_looking_for_pkey primary key (user_id, looking_for_id),
  constraint user_looking_for_looking_for_id_fkey foreign KEY (looking_for_id) references looking_for (id) on delete CASCADE,
  constraint user_looking_for_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Table for storing user votes
create table public.votes (
  id serial not null,
  user_id uuid not null,
  profile_id uuid not null,
  vote_type character varying(10) not null,
  created_at timestamp without time zone null default now(),
  constraint votes_pkey primary key (id),
  constraint votes_user_id_profile_id_key unique (user_id, profile_id),
  constraint fk_profile foreign KEY (profile_id) references profiles (id) on delete CASCADE,
  constraint fk_user foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

--Table to get feedback from users
create table public.feedback (
  user_id uuid not null,
  feedback_text text null,
  created_at timestamp without time zone null default now(),
  constraint feedback_pkey primary key (user_id),
  constraint feedback_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;