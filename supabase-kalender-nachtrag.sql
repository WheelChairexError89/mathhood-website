-- =====================================================================
--  MATHHOOD — Nachtrag zum Buchungskalender
--  Fuegt das Feld "anlass" hinzu (Probestunde, Einzelstunde, Paket …)
--  Einmalig ausfuehren: Supabase → SQL Editor → New query → Run
-- =====================================================================

alter table buchungen
  add column if not exists anlass text;

comment on column buchungen.anlass is
  'Worum es bei dem Termin geht: probestunde, einzelstunde, lernpaket, pruefung';
