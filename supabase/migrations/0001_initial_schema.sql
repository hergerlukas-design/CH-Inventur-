-- =============================================================================
-- CH-Inventur – Initiales Schema
-- Lager-/Warenwirtschaft: Material für Projekte ausgeben/zurücknehmen,
-- Verbrauchsmaterial, Bulk-/geschätzte Ware, manuelle Inventuren.
-- =============================================================================

-- Enums --------------------------------------------------------------------
create type artikel_typ as enum ('exakt', 'bulk');
create type projekt_status as enum ('aktiv', 'abgeschlossen');
create type nutzer_rolle as enum ('Admin', 'Mitarbeiter');
create type bewegung_typ as enum (
  'Wareneingang',
  'Verbrauch',
  'Projektausgabe',
  'Projektrueckgabe',
  'Umlagerung',
  'Inventurkorrektur'
);
create type inventur_status as enum ('offen', 'abgeschlossen');

-- Nutzer / Profile ---------------------------------------------------------
-- Verknüpft mit auth.users. Rolle steuert kritische Aktionen (löschen etc.).
create table nutzer (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  rolle nutzer_rolle not null default 'Mitarbeiter',
  created_at timestamptz not null default now()
);

-- Stammdaten ---------------------------------------------------------------
create table lagerort (
  id uuid primary key default gen_random_uuid (),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table projekt (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  status projekt_status not null default 'aktiv',
  created_at timestamptz not null default now()
);

create table artikel (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  sku text unique,
  barcode text unique,
  kategorie text,
  einheit text not null default 'Stk',
  typ artikel_typ not null default 'exakt',
  mindestbestand numeric,             -- nur relevant für typ = 'exakt'
  bulk_toleranz numeric default 0,    -- Toleranz (%) für Inventur bei typ = 'bulk'
  created_at timestamptz not null default now()
);
create index artikel_kategorie_idx on artikel (kategorie);
create index artikel_barcode_idx on artikel (barcode);

-- Bestand ------------------------------------------------------------------
-- projekt_id gesetzt => Menge ist aktuell "im Einsatz" bei diesem Projekt
-- (herkunfts-Lagerort bleibt referenziert). projekt_id NULL => frei im Lager.
create table bestand (
  id uuid primary key default gen_random_uuid (),
  artikel_id uuid not null references artikel (id) on delete cascade,
  lagerort_id uuid not null references lagerort (id) on delete restrict,
  projekt_id uuid references projekt (id) on delete set null,
  menge numeric not null default 0,
  updated_at timestamptz not null default now()
);
-- Eindeutigkeit pro (artikel, lagerort, projekt) – NULL-projekt getrennt behandelt
create unique index bestand_uniq_frei on bestand (artikel_id, lagerort_id)
  where projekt_id is null;
create unique index bestand_uniq_projekt on bestand (artikel_id, lagerort_id, projekt_id)
  where projekt_id is not null;

-- Bewegungen (grobe Historie, kein Audit-Log) ------------------------------
create table bewegung (
  id uuid primary key default gen_random_uuid (),
  artikel_id uuid not null references artikel (id) on delete cascade,
  lagerort_id uuid not null references lagerort (id) on delete restrict,
  ziel_lagerort_id uuid references lagerort (id) on delete restrict, -- nur Umlagerung
  projekt_id uuid references projekt (id) on delete set null,
  typ bewegung_typ not null,
  menge numeric not null,
  nutzer_id uuid references nutzer (id) on delete set null,
  notiz text,
  zeitstempel timestamptz not null default now()
);
create index bewegung_artikel_idx on bewegung (artikel_id);
create index bewegung_zeit_idx on bewegung (zeitstempel desc);
create index bewegung_projekt_idx on bewegung (projekt_id);

-- Inventur -----------------------------------------------------------------
create table inventur (
  id uuid primary key default gen_random_uuid (),
  datum date not null default current_date,
  status inventur_status not null default 'offen',
  notiz text,
  erstellt_von uuid references nutzer (id) on delete set null,
  created_at timestamptz not null default now()
);

create table inventurposition (
  id uuid primary key default gen_random_uuid (),
  inventur_id uuid not null references inventur (id) on delete cascade,
  artikel_id uuid not null references artikel (id) on delete cascade,
  lagerort_id uuid not null references lagerort (id) on delete restrict,
  soll numeric not null default 0,
  ist numeric,
  unique (inventur_id, artikel_id, lagerort_id)
);

-- =============================================================================
-- Trigger: Profil bei neuem auth.user automatisch anlegen
-- =============================================================================
create or replace function handle_new_user ()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.nutzer (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user ();

-- =============================================================================
-- RPC: Bewegung buchen (atomar Bewegung + Bestand aktualisieren)
-- =============================================================================
create or replace function buche_bewegung (
  p_artikel_id uuid,
  p_lagerort_id uuid,
  p_typ bewegung_typ,
  p_menge numeric,
  p_projekt_id uuid default null,
  p_ziel_lagerort_id uuid default null,
  p_notiz text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_bewegung_id uuid;
  v_nutzer uuid := auth.uid ();
begin
  if p_menge is null or p_menge <= 0 then
    raise exception 'Menge muss grösser als 0 sein';
  end if;

  -- Bewegung protokollieren
  insert into bewegung (artikel_id, lagerort_id, ziel_lagerort_id, projekt_id, typ, menge, nutzer_id, notiz)
  values (p_artikel_id, p_lagerort_id, p_ziel_lagerort_id, p_projekt_id, p_typ, p_menge, v_nutzer, p_notiz)
  returning id into v_bewegung_id;

  -- Bestand anpassen je nach Typ
  case p_typ
    when 'Wareneingang' then
      perform adjust_bestand (p_artikel_id, p_lagerort_id, null, p_menge);

    when 'Verbrauch' then
      perform adjust_bestand (p_artikel_id, p_lagerort_id, null, -p_menge);

    when 'Projektausgabe' then
      if p_projekt_id is null then
        raise exception 'Projektausgabe benötigt ein Projekt';
      end if;
      perform adjust_bestand (p_artikel_id, p_lagerort_id, null, -p_menge);
      perform adjust_bestand (p_artikel_id, p_lagerort_id, p_projekt_id, p_menge);

    when 'Projektrueckgabe' then
      if p_projekt_id is null then
        raise exception 'Projektrückgabe benötigt ein Projekt';
      end if;
      perform adjust_bestand (p_artikel_id, p_lagerort_id, p_projekt_id, -p_menge);
      perform adjust_bestand (p_artikel_id, p_lagerort_id, null, p_menge);

    when 'Umlagerung' then
      if p_ziel_lagerort_id is null then
        raise exception 'Umlagerung benötigt einen Ziel-Lagerort';
      end if;
      perform adjust_bestand (p_artikel_id, p_lagerort_id, null, -p_menge);
      perform adjust_bestand (p_artikel_id, p_ziel_lagerort_id, null, p_menge);

    when 'Inventurkorrektur' then
      -- p_menge ist hier die Differenz (kann via Vorzeichen im Aufruf gesetzt werden)
      perform adjust_bestand (p_artikel_id, p_lagerort_id, p_projekt_id, p_menge);
  end case;

  return v_bewegung_id;
end;
$$;

-- Hilfsfunktion: Bestand einer (artikel, lagerort, projekt)-Kombi verändern
create or replace function adjust_bestand (
  p_artikel_id uuid,
  p_lagerort_id uuid,
  p_projekt_id uuid,
  p_delta numeric
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_projekt_id is null then
    insert into bestand (artikel_id, lagerort_id, projekt_id, menge, updated_at)
    values (p_artikel_id, p_lagerort_id, null, p_delta, now())
    on conflict (artikel_id, lagerort_id) where projekt_id is null
      do update set menge = bestand.menge + excluded.menge, updated_at = now();
  else
    insert into bestand (artikel_id, lagerort_id, projekt_id, menge, updated_at)
    values (p_artikel_id, p_lagerort_id, p_projekt_id, p_delta, now())
    on conflict (artikel_id, lagerort_id, projekt_id) where projekt_id is not null
      do update set menge = bestand.menge + excluded.menge, updated_at = now();
  end if;
end;
$$;

-- =============================================================================
-- RPC: Inventur starten – Snapshot aller aktuellen Bestände als Soll
-- =============================================================================
create or replace function starte_inventur (p_notiz text default null)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_inventur_id uuid;
begin
  insert into inventur (status, notiz, erstellt_von)
  values ('offen', p_notiz, auth.uid ())
  returning id into v_inventur_id;

  -- Nur freie (nicht projektgebundene) Bestände zählen bei der Inventur
  insert into inventurposition (inventur_id, artikel_id, lagerort_id, soll)
  select v_inventur_id, b.artikel_id, b.lagerort_id, b.menge
  from bestand b
  where b.projekt_id is null;

  return v_inventur_id;
end;
$$;

-- =============================================================================
-- RPC: Inventur abschliessen – Differenzen als Inventurkorrektur buchen
-- =============================================================================
create or replace function schliesse_inventur (p_inventur_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  v_nutzer uuid := auth.uid ();
begin
  for r in
    select ip.artikel_id, ip.lagerort_id, ip.ist - ip.soll as diff
    from inventurposition ip
    where ip.inventur_id = p_inventur_id
      and ip.ist is not null
      and ip.ist <> ip.soll
  loop
    -- Bewegung mit vorzeichenbehafteter Differenz protokollieren ...
    insert into bewegung (artikel_id, lagerort_id, typ, menge, nutzer_id, notiz)
    values (r.artikel_id, r.lagerort_id, 'Inventurkorrektur', r.diff, v_nutzer, 'Inventurabgleich');
    -- ... und Bestand exakt auf den Ist-Wert bringen
    perform adjust_bestand (r.artikel_id, r.lagerort_id, null, r.diff);
  end loop;

  update inventur set status = 'abgeschlossen' where id = p_inventur_id;
end;
$$;

-- =============================================================================
-- View: Artikel mit Gesamtbestand + Mindestbestand-Warnung
-- =============================================================================
-- security_invoker: View wertet RLS des abfragenden Nutzers aus (nicht des Owners).
create view artikel_uebersicht
with (security_invoker = true) as
select
  a.*,
  coalesce((select sum(b.menge) from bestand b where b.artikel_id = a.id and b.projekt_id is null), 0) as bestand_frei,
  coalesce((select sum(b.menge) from bestand b where b.artikel_id = a.id and b.projekt_id is not null), 0) as bestand_projekt,
  case
    when a.typ = 'exakt' and a.mindestbestand is not null
     and coalesce((select sum(b.menge) from bestand b where b.artikel_id = a.id and b.projekt_id is null), 0) < a.mindestbestand
    then true else false
  end as unter_mindestbestand
from artikel a;

-- =============================================================================
-- Row Level Security
-- Team-App: jeder eingeloggte Nutzer darf lesen und buchen.
-- Löschen/kritische Änderungen nur für Admins.
-- =============================================================================
alter table nutzer enable row level security;
alter table lagerort enable row level security;
alter table projekt enable row level security;
alter table artikel enable row level security;
alter table bestand enable row level security;
alter table bewegung enable row level security;
alter table inventur enable row level security;
alter table inventurposition enable row level security;

-- Helper: ist aktueller Nutzer Admin?
create or replace function ist_admin ()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from nutzer where id = auth.uid () and rolle = 'Admin'
  );
$$;

-- nutzer: jeder sieht alle Profile; jeder ändert nur sein eigenes, Admin alles
create policy nutzer_select on nutzer for select using (auth.role () = 'authenticated');
create policy nutzer_update_self on nutzer for update using (id = auth.uid () or ist_admin ());
create policy nutzer_admin_all on nutzer for all using (ist_admin ()) with check (ist_admin ());

-- Generisches Muster für Stamm-/Bewegungstabellen:
--   select + insert + update: alle authentifizierten
--   delete: nur Admin
do $$
declare t text;
begin
  foreach t in array array['lagerort','projekt','artikel','bestand','bewegung','inventur','inventurposition']
  loop
    execute format('create policy %I_select on %I for select using (auth.role () = ''authenticated'');', t, t);
    execute format('create policy %I_insert on %I for insert with check (auth.role () = ''authenticated'');', t, t);
    execute format('create policy %I_update on %I for update using (auth.role () = ''authenticated'');', t, t);
    execute format('create policy %I_delete on %I for delete using (ist_admin ());', t, t);
  end loop;
end $$;

-- Realtime aktivieren (Team arbeitet gleichzeitig)
alter publication supabase_realtime add table artikel, bestand, bewegung, projekt, lagerort, inventur, inventurposition;
