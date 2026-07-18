# CH-Inventur

Lager- und Warenwirtschaft als **Progressive Web App (PWA)** für ein kleines Team
(2–5 Personen). Material wird für Projekte **ausgegeben und zurückgenommen**
(kein klassischer Verkauf), Verbrauchsmaterial wird verbraucht. Schwer zählbare
Ware (Putztücher, abgefüllte Flaschen) wird als **Bulk/geschätzt** geführt.

## Funktionen (MVP)

- **Artikelstamm** mit eigener Barcode-/QR-Generierung und Druck über den Browser
- **Lagerorte** (mehrere Standorte, flache Struktur)
- **Bestandsführung** – exakte Artikel stückgenau, Bulk-Artikel geschätzt
- **Warenbewegungen** – Wareneingang, Verbrauch, Projektausgabe/-rückgabe, Umlagerung
- **Inventur** – manuell gestarteter Vollzähl-Snapshot mit Soll/Ist-Abgleich
  (Toleranz für Bulk-Artikel)
- **Mindestbestand-Warnung** für exakt geführte Artikel (z.B. Kanister)
- **Kombinierte Filter** – Lagerort + Projekt + Kategorie gleichzeitig
- **Barcode-Scan** per Kamera (`@zxing/browser`); USB-/Bluetooth-Scanner
  funktionieren direkt über Tastatur-Emulation
- **Historie** – einfache Bewegungsliste
- **Nutzerrollen** – alle dürfen buchen, nur Admin darf löschen
- **Realtime** – alle sehen Änderungen sofort (Supabase Realtime)

## Tech-Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 18 + Vite, PWA via `vite-plugin-pwa` (Workbox) |
| Backend/DB | Supabase (Postgres + Auth + Realtime) |
| Barcode-Scan | `@zxing/browser` |
| Barcode-Druck | `bwip-js` → Bild → Browser-Druckdialog (Dymo LabelManager) |

## Einrichtung

### 1. Supabase-Projekt

1. Auf [supabase.com](https://supabase.com) ein Projekt anlegen.
2. Das Schema einspielen: **beide** Migrationen aus `supabase/migrations/`
   der Reihe nach im **SQL Editor** ausführen
   ([`0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql) =
   Tabellen, RPCs, RLS, Realtime;
   [`0002_function_grants.sql`](supabase/migrations/0002_function_grants.sql) =
   Härtung der Funktions-Berechtigungen) – oder via Supabase CLI `supabase db push`.
3. Unter **Authentication → Providers** E-Mail-Login aktivieren. Für den ersten
   schnellen Start ggf. „Confirm email“ deaktivieren.
4. URL und Anon-Key aus **Project Settings → API** kopieren.

### 2. Frontend

```bash
cp .env.example .env      # dann VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY eintragen
npm install
npm run dev               # Entwicklung
npm run build             # Produktions-Build (dist/)
npm run preview           # Build lokal testen (Service Worker aktiv)
```

### 3. Ersten Admin festlegen

Nach der Registrierung des ersten Kontos wird automatisch ein Profil in der
Tabelle `nutzer` mit Rolle `Mitarbeiter` angelegt. Um jemanden zum Admin zu
machen, im Supabase **SQL Editor**:

```sql
update nutzer set rolle = 'Admin' where id = (
  select id from auth.users where email = 'admin@example.com'
);
```

## Datenmodell

Siehe [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql).
Kern-Tabellen: `artikel`, `lagerort`, `projekt`, `bestand`, `bewegung`,
`nutzer`, `inventur`, `inventurposition`.

Buchungen laufen über die Postgres-Funktion `buche_bewegung(...)`, die Bewegung
und Bestand **atomar** aktualisiert. Inventuren über `starte_inventur()` und
`schliesse_inventur()`.

### Besonderheiten

- **Bulk/geschätzt:** Menge ist eine grobe Schätzung; bei der Inventur greift
  eine prozentuale Toleranz (`artikel.bulk_toleranz`) statt exakter Soll-Ist-Prüfung.
- **Kanister/Flaschen:** Kanister werden exakt geführt (mit Mindestbestand),
  abgefüllte Flaschen als Bulk – keine feste Umfüll-Buchung nötig.
- **Projektausgabe:** verschiebt Menge vom freien Lagerbestand in einen
  projektgebundenen Bestand (`bestand.projekt_id` gesetzt = „im Einsatz“).
  Die Rückgabe kehrt das um.

## Phase 2 (später)

- Live-Status je Projekt (Grundlage über `bestand.projekt_id` bereits gelegt)
- CSV/Excel-Export für die Buchhaltung
- Native DYMO-SDK-Integration
- Push-Benachrichtigungen bei niedrigem Bestand
- Lieferantenverwaltung

## Projektstruktur

```
supabase/migrations/   SQL-Schema (Tabellen, RPCs, RLS, Realtime)
src/
  lib/supabase.js      Supabase-Client
  context/             Auth-Context (Session + Rolle)
  hooks/useData.js     Daten-Hooks mit Realtime
  components/          Layout, Modal, BarcodeScanner, BarcodeLabel, FilterBar
  pages/               Dashboard, Artikel(+Detail), Buchen, Projekte,
                       Inventur(+Detail), Lagerorte, Historie, Login
```
