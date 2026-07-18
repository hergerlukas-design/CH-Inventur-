import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Lädt eine Tabelle/View und abonniert Realtime-Änderungen (Team arbeitet
 * gleichzeitig). `build` erlaubt Filter/Sortierung auf der Query.
 */
export function useTable(table, { build, realtimeTable, deps = [] } = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase.from(table).select('*')
    if (build) query = build(query)
    const { data, error } = await query
    if (error) setError(error.message)
    else {
      setData(data ?? [])
      setError(null)
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, ...deps])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: bei jeder Änderung neu laden (einfach + robust für kleines Team)
  useEffect(() => {
    const src = realtimeTable ?? table
    const channel = supabase
      .channel(`rt-${src}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: src }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, realtimeTable, load])

  return { data, loading, error, reload: load }
}

/** Stammdaten die viele Seiten brauchen: Lagerorte, Projekte, Kategorien. */
export function useStammdaten() {
  const lagerorte = useTable('lagerort', { build: (q) => q.order('name') })
  const projekte = useTable('projekt', { build: (q) => q.order('name') })
  const artikel = useTable('artikel', { build: (q) => q.order('kategorie') })

  const kategorien = [
    ...new Set(artikel.data.map((a) => a.kategorie).filter(Boolean)),
  ].sort()

  return {
    lagerorte: lagerorte.data,
    projekte: projekte.data,
    kategorien,
    loading: lagerorte.loading || projekte.loading,
  }
}
