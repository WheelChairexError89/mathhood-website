-- =====================================================================
--  MATHHOOD: Längengrenzen für Buchungen (zweite Sicherung)
--  Einmalig ausführen: Supabase, SQL Editor, New query, einfügen, Run
--
--  Die Website prüft dasselbe schon im Browser. Diese Grenzen gelten
--  zusätzlich in der Datenbank und halten auch dann, wenn jemand die
--  Website umgeht und die Datenbank direkt anspricht.
--  NOT VALID: bereits vorhandene Einträge werden nicht nachträglich geprüft.
-- =====================================================================

alter table buchungen drop constraint if exists buchungen_laengen;
alter table buchungen add constraint buchungen_laengen check (
      char_length(schueler)                 <= 60
  and char_length(coalesce(klasse, ''))          <= 2
  and char_length(coalesce(ansprechpartner, '')) <= 80
  and char_length(email)                        <= 100
  and char_length(coalesce(telefon, ''))         <= 30
  and char_length(coalesce(unterrichtsart, ''))  <= 20
  and char_length(coalesce(plz, ''))             <= 5
  and char_length(coalesce(thema, ''))           <= 1000
  and char_length(coalesce(anlass, ''))          <= 30
) not valid;
