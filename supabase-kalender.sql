-- =====================================================================
--  MATHHOOD — Buchungskalender
--  Einmalig ausfuehren: Supabase → SQL Editor → New query → einfuegen → Run
-- =====================================================================

-- ---------------------------------------------------------------
--  1. Wiederkehrende Verfuegbarkeit (Robins freie Zeiten)
-- ---------------------------------------------------------------
create table if not exists verfuegbarkeit (
  id        bigint generated always as identity primary key,
  wochentag smallint not null check (wochentag between 0 and 6),  -- 0=So, 1=Mo … 6=Sa
  von_zeit  time     not null,
  bis_zeit  time     not null,
  aktiv     boolean  not null default true,
  check (bis_zeit > von_zeit)
);

comment on table verfuegbarkeit is
  'Robins wiederkehrende Wochenzeiten. Beispiel: Montag 18:00-21:00.';

-- ---------------------------------------------------------------
--  2. Ausnahmen (Urlaub, Feiertage, einzelne Sperrungen)
-- ---------------------------------------------------------------
create table if not exists ausnahmen (
  id    bigint generated always as identity primary key,
  datum date not null unique,
  grund text
);

comment on table ausnahmen is
  'Tage, an denen trotz Wochenplan nichts geht (Urlaub, Feiertag).';

-- ---------------------------------------------------------------
--  3. Buchungen
-- ---------------------------------------------------------------
create table if not exists buchungen (
  id              bigint generated always as identity primary key,
  datum           date not null,
  uhrzeit         time not null,
  schueler        text not null,
  klasse          text,
  ansprechpartner text,
  email           text not null,
  telefon         text,
  unterrichtsart  text,
  plz             text,
  thema           text,
  anlass          text,
  erstellt_am     timestamptz not null default now(),
  -- verhindert Doppelbuchung auf Datenbankebene
  unique (datum, uhrzeit)
);

comment on table buchungen is
  'Gebuchte Termine. Enthaelt personenbezogene Daten — nie oeffentlich lesbar!';

-- ---------------------------------------------------------------
--  4. Pruefung: Buchung muss in eine freie Zeit fallen
--     Verhindert, dass jemand per Direktzugriff Termine ausserhalb
--     der Sprechzeiten oder in der Vergangenheit anlegt.
-- ---------------------------------------------------------------
create or replace function pruefe_buchung()
returns trigger
language plpgsql
as $$
begin
  if new.datum < current_date then
    raise exception 'Termin liegt in der Vergangenheit';
  end if;

  if new.datum > current_date + interval '120 days' then
    raise exception 'Termin liegt zu weit in der Zukunft';
  end if;

  if exists (select 1 from ausnahmen a where a.datum = new.datum) then
    raise exception 'An diesem Tag ist kein Unterricht moeglich';
  end if;

  if not exists (
    select 1 from verfuegbarkeit v
     where v.aktiv
       and v.wochentag = extract(dow from new.datum)
       and new.uhrzeit >= v.von_zeit
       and (new.uhrzeit + interval '70 minutes')::time <= v.bis_zeit
  ) then
    raise exception 'Zu dieser Zeit findet kein Unterricht statt';
  end if;

  return new;
end;
$$;

drop trigger if exists buchung_pruefen on buchungen;
create trigger buchung_pruefen
  before insert on buchungen
  for each row execute function pruefe_buchung();

-- ---------------------------------------------------------------
--  5. Sicherheitsregeln (RLS)
-- ---------------------------------------------------------------
alter table verfuegbarkeit enable row level security;
alter table ausnahmen      enable row level security;
alter table buchungen      enable row level security;

-- Verfuegbarkeit und Ausnahmen darf jeder LESEN (fuer die Kalenderanzeige)
drop policy if exists "verfuegbarkeit lesbar" on verfuegbarkeit;
create policy "verfuegbarkeit lesbar" on verfuegbarkeit
  for select to anon, authenticated using (true);

drop policy if exists "ausnahmen lesbar" on ausnahmen;
create policy "ausnahmen lesbar" on ausnahmen
  for select to anon, authenticated using (true);

-- Buchungen: jeder darf ANLEGEN, aber NIEMAND darf sie lesen.
-- Ohne SELECT-Regel kommt ueber die Website niemand an fremde Daten.
drop policy if exists "buchung anlegen" on buchungen;
create policy "buchung anlegen" on buchungen
  for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------
--  6. Belegte Zeiten abfragen — OHNE personenbezogene Daten
--     Gibt nur Datum und Uhrzeit zurueck, keine Namen, keine E-Mails.
-- ---------------------------------------------------------------
create or replace function belegte_zeiten()
returns table (datum date, uhrzeit time)
language sql
security definer
set search_path = public
as $$
  select b.datum, b.uhrzeit
    from buchungen b
   where b.datum >= current_date
     and b.datum <= current_date + interval '120 days';
$$;

grant execute on function belegte_zeiten() to anon, authenticated;

-- =====================================================================
--  7. Robins Zeiten eintragen — HIER ANPASSEN
--     0=Sonntag, 1=Montag, 2=Dienstag, 3=Mittwoch,
--     4=Donnerstag, 5=Freitag, 6=Samstag
-- =====================================================================
delete from verfuegbarkeit;

insert into verfuegbarkeit (wochentag, von_zeit, bis_zeit) values
  (1, '18:00', '21:00'),   -- Montag
  (2, '18:00', '21:00'),   -- Dienstag
  (3, '18:00', '21:00'),   -- Mittwoch
  (4, '18:00', '21:00'),   -- Donnerstag
  (5, '16:00', '21:00'),   -- Freitag
  (6, '09:00', '18:00'),   -- Samstag
  (0, '10:00', '18:00');   -- Sonntag

-- Beispiel fuer einen gesperrten Tag:
-- insert into ausnahmen (datum, grund) values ('2026-12-24', 'Heiligabend');
