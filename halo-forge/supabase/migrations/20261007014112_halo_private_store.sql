-- Server-only wallet auth. Browser roles receive no table or schema privileges.
create schema halo_private;
revoke all on schema halo_private from public, anon, authenticated;
create role halo_app nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
grant usage on schema halo_private to halo_app;

create table halo_private.app_state (
  id smallint primary key check (id = 1),
  data jsonb not null check (jsonb_typeof(data) = 'object')
);
create table halo_private.sessions (
  token_hash text primary key,
  wallet text not null,
  preview smallint not null check (preview in (0,1)),
  expires bigint not null
);
create index sessions_expires_idx on halo_private.sessions(expires);
create table halo_private.nonces (
  id text primary key,
  message text not null,
  wallet text not null,
  expires bigint not null
);
create index nonces_expires_idx on halo_private.nonces(expires);
create table halo_private.rate_limits (
  key text primary key,
  count integer not null check (count > 0),
  reset bigint not null
);
create index rate_limits_reset_idx on halo_private.rate_limits(reset);

revoke all on all tables in schema halo_private from public, anon, authenticated;
grant select, insert, update on halo_private.app_state to halo_app;
grant select, insert, update, delete on halo_private.sessions, halo_private.nonces, halo_private.rate_limits to halo_app;

alter table halo_private.app_state enable row level security;
alter table halo_private.sessions enable row level security;
alter table halo_private.nonces enable row level security;
alter table halo_private.rate_limits enable row level security;
-- Only the trusted server role can access records. Wallet ownership is checked
-- in the existing API; these are not Supabase Auth identities.
create policy server_state on halo_private.app_state to halo_app using (true) with check (true);
create policy server_sessions on halo_private.sessions to halo_app using (true) with check (true);
create policy server_nonces on halo_private.nonces to halo_app using (true) with check (true);
create policy server_limits on halo_private.rate_limits to halo_app using (true) with check (true);
