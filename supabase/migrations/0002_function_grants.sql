-- =============================================================================
-- CH-Inventur – Härtung der Funktions-Berechtigungen
-- Supabase vergibt EXECUTE auf public-Funktionen standardmässig an anon +
-- authenticated. Für SECURITY-DEFINER-Funktionen ist das teils zu weit:
--   * interne Helfer sollen gar nicht über die REST-API erreichbar sein
--   * die Buchungs-/Inventur-RPCs nur für eingeloggte Nutzer, nicht anonym
-- =============================================================================

-- Interne Helfer: nicht über /rest/v1/rpc aufrufbar. Aufrufe aus anderen
-- SECURITY-DEFINER-Funktionen (laufen als Owner) und Trigger bleiben möglich.
revoke all on function public.adjust_bestand(uuid, uuid, uuid, numeric) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ist_admin() wird in RLS-Policies ausgewertet -> authenticated braucht EXECUTE,
-- anon nicht.
revoke all on function public.ist_admin() from public, anon;
grant execute on function public.ist_admin() to authenticated;

-- Buchungs-/Inventur-RPCs nur für eingeloggte Nutzer, nicht anon.
revoke all on function public.buche_bewegung(uuid, uuid, public.bewegung_typ, numeric, uuid, uuid, text) from public, anon;
grant execute on function public.buche_bewegung(uuid, uuid, public.bewegung_typ, numeric, uuid, uuid, text) to authenticated;

revoke all on function public.starte_inventur(text) from public, anon;
grant execute on function public.starte_inventur(text) to authenticated;

revoke all on function public.schliesse_inventur(uuid) from public, anon;
grant execute on function public.schliesse_inventur(uuid) to authenticated;
