/* =====================================================================
   MATHHOOD — Zugangsdaten für den Lernbereich (Supabase)

   HIER die beiden Werte aus dem Supabase-Projekt eintragen:
   Dashboard → Settings → API Keys   (oder Knopf "Connect" oben)

   supabaseUrl : die reine Projekt-Adresse, OHNE /rest/v1 am Ende
                 richtig:  https://abcdefgh.supabase.co
                 falsch:   https://abcdefgh.supabase.co/rest/v1/

   supabaseKey : der "Publishable key", beginnt mit  sb_publishable_...
                 (bei älteren Projekten hiess er "anon public")

   Keine Sorge wegen des Schlüssels: Er ist ausdrücklich dafür gemacht,
   im Browser zu stehen. Er allein gibt niemandem Zugriff — das regeln
   die Sicherheitsregeln (RLS) in der Datenbank.

   NIEMALS hier eintragen: "Secret key" (sb_secret_...) oder
   "service_role" — die umgehen sämtliche Sicherheitsregeln.
   ===================================================================== */
window.MH_CONFIG = {
  supabaseUrl: 'https://piolnmftcsryzuvaonoe.supabase.co',
  supabaseKey: 'sb_publishable_3Zp_j4WD394H3kqMMLvrqA_JzNM1E-p',

  /* Name des Ordners (Bucket) mit dem Lernmaterial */
  bucket: 'lernmaterial',

  /* Ordner, den alle angemeldeten Schüler sehen dürfen */
  gemeinsamerOrdner: '_allgemein'
};
