-- ===============================
-- SIAV - Script SQL Consolidado
-- Banco de dados otimizado para Supabase
-- ===============================

-- 1. Tabela de Perfis de Usuário
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  profession text,
  council_register text,
  plan text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Tabela de Atendimentos PCR
create table if not exists pcr_logs (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  patient_name text,
  initial_rhythm text,
  duration integer,
  shock_count integer,
  time_to_first_shock integer,
  rosc_achieved boolean,
  created_at timestamptz default now()
);

-- 3. Tabela de Simulações Clínicas
create table if not exists simulation_logs (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  case_id text,
  case_title text,
  difficulty text,
  total_score integer,
  total_steps integer,
  attempts integer,
  duration_seconds integer,
  completed boolean default true,
  created_at timestamptz default now()
);

-- 4. Tabela de Casos Clínicos (para simulador)
create table if not exists clinical_cases (
  id text primary key,
  title text not null,
  difficulty text,
  game_flow jsonb not null
);

-- 5. Ativar Row Level Security (RLS)
alter table profiles enable row level security;
alter table pcr_logs enable row level security;
alter table simulation_logs enable row level security;
alter table clinical_cases enable row level security;

-- 6. Políticas de Segurança: Cada usuário só vê seus dados
create policy "Users can manage own profile" on profiles
  for all using (auth.uid() = id);

create policy "Users can manage own pcr logs" on pcr_logs
  for all using (auth.uid() = user_id);

create policy "Users can manage own simulation logs" on simulation_logs
  for all using (auth.uid() = user_id);

create policy "Public read clinical cases" on clinical_cases
  for select using (true);

-- 7. Função: Cria perfil automático ao novo login
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, created_at)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', now())
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- FIM DO SCRIPT
