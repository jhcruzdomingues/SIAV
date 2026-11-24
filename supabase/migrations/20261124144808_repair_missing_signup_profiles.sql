-- Additive recovery for the inspected state: Auth trigger exists, profiles does not.
-- Apply transactionally. Never silently change a table restored by another operation.
DO $guard$
BEGIN
  IF pg_catalog.to_regclass('public.profiles') IS NOT NULL THEN
    RAISE EXCEPTION 'Recovery stopped: public.profiles already exists; inspect it first.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'auth.users'::pg_catalog.regclass
      AND tgname = 'on_auth_user_created'
      AND tgfoid = 'public.handle_new_user()'::pg_catalog.regprocedure
      AND NOT tgisinternal AND tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'Recovery stopped: the expected Auth trigger is absent or changed.';
  END IF;
END;
$guard$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Auth supplies this value. Nullable for the existing partial client upsert.
  email text UNIQUE,
  full_name text,
  profession text,
  council_register text,
  council_state text CHECK (council_state IS NULL OR council_state IN
    ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  phone_number text,
  birth_date date,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Override inherited default grants for this new table only.
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT INSERT (id, full_name, profession, council_register, council_state, phone_number, birth_date)
  ON public.profiles TO authenticated;
-- The current upsert includes the same id; WITH CHECK prevents reassignment.
GRANT UPDATE (id, full_name, profession, council_register, council_state, phone_number, birth_date)
  ON public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

CREATE FUNCTION public.siav_touch_profile_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.siav_touch_profile_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER siav_profile_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.siav_touch_profile_updated_at();

-- Replacing the function keeps its identity and the existing Auth trigger.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $function$
DECLARE
  supplied_birth_date date;
  supplied_council_state text;
BEGIN
  -- Descriptive metadata is untrusted; it never sets plan or authorization.
  IF NEW.raw_user_meta_data ->> 'birth_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    BEGIN
      supplied_birth_date := (NEW.raw_user_meta_data ->> 'birth_date')::date;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
      supplied_birth_date := NULL;
    END;
  END IF;
  supplied_council_state := pg_catalog.upper(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'council_state'));
  IF supplied_council_state NOT IN
    ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO') THEN
    supplied_council_state := NULL;
  END IF;
  INSERT INTO public.profiles
    (id, email, full_name, profession, council_register, council_state, phone_number, birth_date)
  VALUES
    (NEW.id, NEW.email,
     NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
     NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'profession'), ''),
     NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'council_register'), ''),
     supplied_council_state,
     NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'phone_number'), ''),
     supplied_birth_date)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
