import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// No Supabase connection or credentials. No published ports, volumes or external network.
const image = 'postgres@sha256:f9cf3e1f0066f0eb0c48707d864f0ac5941e9ff454a072077d97a4d278d07d73';
const container = 'siav-signup-test-' + randomUUID();
const run = promisify(execFile);
const migration = await readFile(new URL('../../supabase/migrations/20261124192132_repair_missing_signup_profiles.sql', import.meta.url), 'utf8');
const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
let started = false;
function sql(query) {
  return new Promise((resolve, reject) => {
    const child = execFile('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'],
      { timeout: 30000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) reject(Object.assign(error, { stdout, stderr })); else resolve(stdout.trim());
      });
    child.stdin.end(query);
  });
}
const tx = query => sql(`BEGIN;\n${query}\nROLLBACK;`);
const actor = id => `SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${id}', true);`;
const fixtures = `
 CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
 CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE ROLE supabase_auth_admin NOLOGIN;
 CREATE SCHEMA auth;
 CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb);
 GRANT USAGE ON SCHEMA auth TO PUBLIC;
 GRANT INSERT, SELECT ON auth.users TO supabase_auth_admin;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
   SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
 $$;
 ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
 CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
 BEGIN
   INSERT INTO public.profiles (id, email, full_name, created_at)
   VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', now());
   RETURN NEW;
 END; $$;
 CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
 CREATE TABLE public.unrelated_synthetic_table (marker text);
 INSERT INTO public.unrelated_synthetic_table VALUES ('PRESERVED');
`;
const users = `
 INSERT INTO auth.users VALUES
 ('${A}', 'a@example.invalid', '{"full_name":"Pessoa Sintetica A","profession":"Estudante","plan":"professional","birth_date":"2004-02-29","phone_number":"SYNTHETIC","council_state":"sp"}'),
 ('${B}', 'b@example.invalid', '{"full_name":"Pessoa Sintetica B"}');
`;

before(async () => {
  try { await run('docker', ['image', 'inspect', image], { maxBuffer: 1024 * 1024 }); }
  catch { await run('docker', ['pull', image], { timeout: 180000, maxBuffer: 4 * 1024 * 1024 }); }
  await run('docker', ['run', '--detach', '--rm', '--network', 'none', '--name', container,
    '-e', 'POSTGRES_PASSWORD=SYNTHETIC_DISPOSABLE_TEST_ONLY', image], { timeout: 30000 });
  started = true;
  for (let attempt = 0; attempt < 60; attempt++) {
    // The image starts a temporary socket-only server during initialization.
    // Wait for TCP on loopback so fixtures run only on the final server.
    try { await run('docker', ['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']); break; }
    catch (error) { if (attempt === 59) throw error; await new Promise(resolve => setTimeout(resolve, 250)); }
  }
  await sql(fixtures);
}, { timeout: 240000 });
after(async () => { if (started) await run('docker', ['rm', '--force', container]); });

test('reproduz cadastro abortado quando o gatilho aponta para tabela ausente', async () => {
  await assert.rejects(sql(`INSERT INTO auth.users VALUES ('${A}', 'a@example.invalid', '{}');`), error => /42P01/.test(error.stderr));
  assert.equal(await sql('SELECT count(*) FROM auth.users;'), '0');
});

test('estado diferente do gatilho esperado aborta o reparo antes de criar tabela', async () => {
  await assert.rejects(sql(`BEGIN; ALTER TRIGGER on_auth_user_created ON auth.users RENAME TO unexpected_trigger;\n${migration}\nCOMMIT;`),
    error => /expected Auth trigger is absent or changed/.test(error.stderr));
  assert.equal(await sql("SELECT to_regclass('public.profiles') IS NULL;"), 't');
  assert.equal(await sql("SELECT count(*) FROM pg_trigger WHERE tgname='on_auth_user_created';"), '1');
});

test('aplica reparo sem duplicar gatilho de Auth ou tocar tabela não relacionada', async () => {
  await sql(`BEGIN;\n${migration}\nCOMMIT;`);
  assert.equal(await sql("SELECT count(*) FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal;"), '1');
  assert.equal(await sql('SELECT marker FROM public.unrelated_synthetic_table;'), 'PRESERVED');
  assert.equal(await sql("SELECT relrowsecurity FROM pg_class WHERE oid='public.profiles'::regclass;"), 't');
  assert.equal(await sql("SELECT proconfig::text FROM pg_proc WHERE oid='public.handle_new_user()'::regprocedure;"), '{search_path=pg_catalog}');
});

test('inserção de Auth cria um único perfil com metadados, ignorando plano fornecido', async () => {
  await tx(`SET LOCAL ROLE supabase_auth_admin; ${users}
    RESET ROLE;
    DO $$ BEGIN
      ASSERT (SELECT count(*) FROM public.profiles) = 2;
      ASSERT (SELECT plan FROM public.profiles WHERE id='${A}') = 'free';
      ASSERT (SELECT profession FROM public.profiles WHERE id='${A}') = 'Estudante';
      ASSERT (SELECT council_state FROM public.profiles WHERE id='${A}') = 'SP';
      ASSERT (SELECT phone_number FROM public.profiles WHERE id='${A}') = 'SYNTHETIC';
      ASSERT (SELECT birth_date FROM public.profiles WHERE id='${A}') = '2004-02-29'::date;
      ASSERT (SELECT email FROM public.profiles WHERE id='${A}') = 'a@example.invalid';
    END $$;`);
});

test('metadados opcionais ausentes ou inválidos não abortam um novo cadastro', async () => {
  await tx(`INSERT INTO auth.users VALUES ('${A}', 'a@example.invalid', '{"birth_date":"2000-99-99","council_state":"INVALID"}');
    DO $$ BEGIN
      ASSERT (SELECT count(*) FROM public.profiles) = 1;
      ASSERT (SELECT birth_date IS NULL AND council_state IS NULL AND full_name IS NULL FROM public.profiles WHERE id='${A}');
    END $$;`);
});

test('usuário A vê somente A; atualização de B não altera nenhuma linha', async () => {
  await tx(`${users} ${actor(A)}
    DO $$ DECLARE affected integer; BEGIN
      ASSERT (SELECT count(*) FROM public.profiles) = 1;
      ASSERT (SELECT id FROM public.profiles LIMIT 1) = '${A}'::uuid;
      UPDATE public.profiles SET full_name='WRONG' WHERE id='${B}';
      GET DIAGNOSTICS affected = ROW_COUNT;
      ASSERT affected = 0;
    END $$;
    RESET ROLE;
    DO $$ BEGIN ASSERT (SELECT full_name FROM public.profiles WHERE id='${B}')='Pessoa Sintetica B'; END $$;`);
});

test('upsert parcial do formulário funciona e preserva e-mail, plano e criação', async () => {
  await tx(`${users} ${actor(A)}
    INSERT INTO public.profiles (id, full_name, profession, council_register, phone_number, birth_date)
    VALUES ('${A}', 'Nome Sintetico Editado', 'Estudante', '', 'SYNTHETIC_EDITED', '2004-03-01')
    ON CONFLICT (id) DO UPDATE SET id=excluded.id, full_name=excluded.full_name, profession=excluded.profession,
      council_register=excluded.council_register, phone_number=excluded.phone_number, birth_date=excluded.birth_date;
    DO $$ BEGIN
      ASSERT (SELECT full_name FROM public.profiles) = 'Nome Sintetico Editado';
      ASSERT (SELECT email FROM public.profiles) = 'a@example.invalid';
      ASSERT (SELECT plan FROM public.profiles) = 'free';
      ASSERT (SELECT phone_number FROM public.profiles) = 'SYNTHETIC_EDITED';
      ASSERT (SELECT birth_date FROM public.profiles) = '2004-03-01'::date;
    END $$;`);
});

test('cliente não pode promover plano, alterar e-mail do perfil nem apagar/truncar registros', async () => {
  await tx(`${users} ${actor(A)}
    DO $$ BEGIN
      BEGIN UPDATE public.profiles SET plan='professional' WHERE id='${A}'; RAISE EXCEPTION 'plan update was allowed';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
      BEGIN UPDATE public.profiles SET email='other@example.invalid' WHERE id='${A}'; RAISE EXCEPTION 'email update was allowed';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
      BEGIN DELETE FROM public.profiles WHERE id='${A}'; RAISE EXCEPTION 'delete was allowed';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
      BEGIN TRUNCATE public.profiles; RAISE EXCEPTION 'truncate was allowed';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
      ASSERT (SELECT plan FROM public.profiles) = 'free';
    END $$;`);
});

test('inserção com plano e escrita em outro perfil são bloqueadas', async () => {
  await tx(`${users} ${actor(A)}
    DO $$ BEGIN
      BEGIN INSERT INTO public.profiles (id, plan) VALUES ('${A}', 'professional'); RAISE EXCEPTION 'plan insert was allowed';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
      BEGIN UPDATE public.profiles SET id='00000000-0000-4000-8000-000000000003' WHERE id='${A}'; RAISE EXCEPTION 'owner reassignment was allowed';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
      BEGIN INSERT INTO public.profiles (id, full_name) VALUES ('${B}', 'WRONG') ON CONFLICT (id) DO UPDATE SET full_name=excluded.full_name;
        RAISE EXCEPTION 'cross-profile upsert was allowed';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    END $$;`);
});

test('visitante não lê perfis e funções de gatilho não são executáveis publicamente', async () => {
  await tx(`${users} SET LOCAL ROLE anon;
    DO $$ BEGIN
      BEGIN PERFORM id FROM public.profiles; RAISE EXCEPTION 'anonymous select was allowed';
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    END $$;
    RESET ROLE;
    DO $$ BEGIN
      ASSERT NOT has_function_privilege('anon','public.handle_new_user()','EXECUTE');
      ASSERT NOT has_function_privilege('authenticated','public.handle_new_user()','EXECUTE');
      ASSERT NOT has_function_privilege('anon','public.siav_touch_profile_updated_at()','EXECUTE');
    END $$;`);
});

test('reaplicação aborta sem reescrever tabela existente ou registros', async () => {
  await sql(users);
  await assert.rejects(sql(`BEGIN;\n${migration}\nCOMMIT;`), error => /profiles already exists/.test(error.stderr));
  assert.equal(await sql('SELECT count(*) FROM public.profiles;'), '2');
  assert.equal(await sql('SELECT marker FROM public.unrelated_synthetic_table;'), 'PRESERVED');
});
