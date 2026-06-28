-- 1. Create clients table
create table if not exists public.clients (
  id text primary key,
  type text not null,
  name text not null,
  trade_name text,
  legal_name text,
  document text,
  state_registration text,
  municipal_registration text,
  phone text,
  email text,
  address text,
  number text,
  district text,
  city text,
  state text default 'MG',
  created_at timestamptz default now()
);

-- 2. Create employees table
create table if not exists public.employees (
  id text primary key,
  name text not null,
  username text not null unique,
  password text not null,
  role text default 'employee',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 3. Create protocols table
create table if not exists public.protocols (
  id text primary key,
  number text not null,
  date text not null,
  employee_id text,
  employee_name text,
  client_id text,
  client_name text,
  status text not null,
  due_date text,
  delivered_to text,
  notes text,
  attachments jsonb default '[]'::jsonb,
  history jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 4. Create fees table
create table if not exists public.fees (
  id text primary key,
  code text not null,
  issue_date text not null,
  due_date text not null,
  category text not null,
  client_id text,
  client_name text,
  value numeric(12, 2) not null default 0.00,
  status text not null,
  created_at timestamptz default now()
);

-- 5. Create fee_categories table
create table if not exists public.fee_categories (
  id text primary key,
  name text not null unique,
  created_at timestamptz default now()
);

-- 6. Create audit_logs table
create table if not exists public.audit_logs (
  id text primary key,
  timestamp timestamptz default now(),
  user_id text,
  user_name text,
  action text not null,
  entity_type text not null,
  entity_id text,
  entity_name text,
  details text
);

-- 6. Create company table
create table if not exists public.company (
  id text primary key default 'main',
  trade_name text,
  legal_name text,
  cnpj text,
  phone text,
  address text,
  logo text
);

-- Enable row level security (RLS) on all new tables
alter table public.clients enable row level security;
alter table public.employees enable row level security;
alter table public.protocols enable row level security;
alter table public.fees enable row level security;
alter table public.fee_categories enable row level security;
alter table public.audit_logs enable row level security;
alter table public.company enable row level security;

-- Create public policies for open access (read/write all)
drop policy if exists "Allow read on clients" on public.clients;
drop policy if exists "Allow write on clients" on public.clients;
create policy "Allow read on clients" on public.clients for select using (true);
create policy "Allow write on clients" on public.clients for all using (true) with check (true);

drop policy if exists "Allow read on employees" on public.employees;
drop policy if exists "Allow write on employees" on public.employees;
create policy "Allow read on employees" on public.employees for select using (true);
create policy "Allow write on employees" on public.employees for all using (true) with check (true);

drop policy if exists "Allow read on protocols" on public.protocols;
drop policy if exists "Allow write on protocols" on public.protocols;
create policy "Allow read on protocols" on public.protocols for select using (true);
create policy "Allow write on protocols" on public.protocols for all using (true) with check (true);

drop policy if exists "Allow read on fees" on public.fees;
drop policy if exists "Allow write on fees" on public.fees;
create policy "Allow read on fees" on public.fees for select using (true);
create policy "Allow write on fees" on public.fees for all using (true) with check (true);

drop policy if exists "Allow read on audit_logs" on public.audit_logs;
drop policy if exists "Allow write on audit_logs" on public.audit_logs;
create policy "Allow read on audit_logs" on public.audit_logs for select using (true);
create policy "Allow write on audit_logs" on public.audit_logs for all using (true) with check (true);

drop policy if exists "Allow read on company" on public.company;
drop policy if exists "Allow write on company" on public.company;
create policy "Allow read on company" on public.company for select using (true);
create policy "Allow write on company" on public.company for all using (true) with check (true);

drop policy if exists "Allow read on fee_categories" on public.fee_categories;
drop policy if exists "Allow write on fee_categories" on public.fee_categories;
create policy "Allow read on fee_categories" on public.fee_categories for select using (true);
create policy "Allow write on fee_categories" on public.fee_categories for all using (true) with check (true);

-- DATA MIGRATION SECTION: Transfer existing data from app_data to new tables if it exists
do $$
begin
  -- Migrate clients
  if exists (select 1 from public.app_data where key = 'clients') then
    insert into public.clients (id, type, name, trade_name, legal_name, document, state_registration, municipal_registration, phone, email, address, number, district, city, state)
    select 
      (val->>'id') as id,
      (val->>'type') as type,
      (val->>'name') as name,
      (val->>'tradeName') as trade_name,
      (val->>'legalName') as legal_name,
      (val->>'document') as document,
      (val->>'stateRegistration') as state_registration,
      (val->>'municipalRegistration') as municipal_registration,
      (val->>'phone') as phone,
      (val->>'email') as email,
      (val->>'address') as address,
      (val->>'number') as number,
      (val->>'district') as district,
      (val->>'city') as city,
      coalesce(val->>'state', 'MG') as state
    from (
      select jsonb_array_elements(value) as val 
      from public.app_data 
      where key = 'clients'
    ) sub
    on conflict (id) do nothing;
  end if;

  -- Migrate employees
  if exists (select 1 from public.app_data where key = 'employees') then
    insert into public.employees (id, name, username, password, role, permissions)
    select 
      (val->>'id') as id,
      (val->>'name') as name,
      coalesce(val->>'username', val->>'name') as username,
      coalesce(val->>'password', 'admin123') as password,
      coalesce(val->>'role', 'employee') as role,
      coalesce(val->'permissions', '{}'::jsonb) as permissions
    from (
      select jsonb_array_elements(value) as val 
      from public.app_data 
      where key = 'employees'
    ) sub
    on conflict (id) do nothing;
  end if;

  -- Migrate protocols
  if exists (select 1 from public.app_data where key = 'protocols') then
    insert into public.protocols (id, number, date, employee_id, employee_name, client_id, client_name, status, due_date, delivered_to, notes, attachments, history)
    select 
      (val->>'id') as id,
      (val->>'number') as number,
      (val->>'date') as date,
      (val->>'employeeId') as employee_id,
      (val->>'employeeName') as employee_name,
      (val->>'clientId') as client_id,
      (val->>'clientName') as client_name,
      (val->>'status') as status,
      (val->>'dueDate') as due_date,
      (val->>'deliveredTo') as delivered_to,
      (val->>'notes') as notes,
      coalesce(val->'attachments', '[]'::jsonb) as attachments,
      coalesce(val->'history', '[]'::jsonb) as history
    from (
      select jsonb_array_elements(value) as val 
      from public.app_data 
      where key = 'protocols'
    ) sub
    on conflict (id) do nothing;
  end if;

  -- Migrate fees
  if exists (select 1 from public.app_data where key = 'fees') then
    insert into public.fees (id, code, issue_date, due_date, category, client_id, client_name, value, status)
    select 
      (val->>'id') as id,
      (val->>'code') as code,
      (val->>'issueDate') as issue_date,
      (val->>'dueDate') as due_date,
      (val->>'category') as category,
      (val->>'clientId') as client_id,
      (val->>'clientName') as client_name,
      coalesce((val->>'value')::numeric, 0.00) as value,
      (val->>'status') as status
    from (
      select jsonb_array_elements(value) as val 
      from public.app_data 
      where key = 'fees'
    ) sub
    on conflict (id) do nothing;
  end if;

  -- Migrate audit logs
  if exists (select 1 from public.app_data where key = 'auditLogs') then
    insert into public.audit_logs (id, timestamp, user_id, user_name, action, entity_type, entity_id, entity_name, details)
    select 
      (val->>'id') as id,
      coalesce((val->>'timestamp')::timestamptz, now()) as timestamp,
      (val->>'userId') as user_id,
      (val->>'userName') as user_name,
      (val->>'action') as action,
      (val->>'entityType') as entity_type,
      (val->>'entityId') as entity_id,
      (val->>'entityName') as entity_name,
      (val->>'details') as details
    from (
      select jsonb_array_elements(value) as val 
      from public.app_data 
      where key = 'auditLogs'
    ) sub
    on conflict (id) do nothing;
  end if;

  -- Migrate company info
  if exists (select 1 from public.app_data where key = 'company') then
    insert into public.company (id, trade_name, legal_name, cnpj, phone, address, logo)
    select 
      'main' as id,
      (value->>'tradeName') as trade_name,
      (value->>'legalName') as legal_name,
      (value->>'cnpj') as cnpj,
      (value->>'phone') as phone,
      (value->>'address') as address,
      (value->>'logo') as logo
    from public.app_data 
    where key = 'company'
    on conflict (id) do update set
      trade_name = excluded.trade_name,
      legal_name = excluded.legal_name,
      cnpj = excluded.cnpj,
      phone = excluded.phone,
      address = excluded.address,
      logo = excluded.logo;
  end if;
end $$;

-- Seed default fee categories (insert only if table is empty)
insert into public.fee_categories (id, name)
select gen_random_uuid()::text, name
from (values
  ('Contrato Mensal'),
  ('Contrato Trimestral'),
  ('Contrato Semestral'),
  ('Contrato Anual'),
  ('Consultoria'),
  ('Abertura de Empresa'),
  ('Encerramento de Empresa'),
  ('Declaração de Imposto de Renda (IRPF)'),
  ('Declaração de Imposto de Renda (IRPJ)'),
  ('Regularização Fiscal'),
  ('Parcelamento de Débitos'),
  ('Alvará e Licenças'),
  ('Certidões e Documentos'),
  ('Folha de Pagamento'),
  ('Rescisão Trabalhista'),
  ('Recursos e Defesas'),
  ('Outros')
) as t(name)
where not exists (select 1 from public.fee_categories);
