import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Catálogo de creadores de la organización, visto desde el portal del
 * cliente: llama a `get_creator_catalog_for_client` (SECURITY DEFINER — la
 * propia función valida que quien pregunta sea el usuario de ese cliente) y
 * expone búsqueda + filtros en memoria.
 *
 * Hoy son 291 creadores y casi ninguno tiene ficha creativa todavía, así que
 * las tarjetas deben verse dignas con `completitud: 0` y arrays vacíos — este
 * hook nunca deja pasar `undefined` a la pantalla, siempre normaliza a string
 * vacío, array vacío o `null`.
 */

export interface CreatorCatalogSample {
  titulo: string | null;
  media_url: string;
  thumbnail_url: string | null;
}

export interface CreatorCatalogEntry {
  user_id: string;
  nombre: string;
  avatar_url: string | null;
  ciudad: string | null;
  bio: string | null;
  rango_edad: string | null;
  genero: string | null;
  estilo_energia: string | null;
  nichos_afines: string[];
  formatos_fuertes: string[];
  escenarios: string[];
  restricciones: string[];
  completitud: number;
  muestras: CreatorCatalogSample[];
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function parseSamples(value: unknown): CreatorCatalogSample[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => ({
      titulo: typeof s.titulo === 'string' && s.titulo.trim() ? s.titulo : null,
      media_url: typeof s.media_url === 'string' ? s.media_url : '',
      thumbnail_url: typeof s.thumbnail_url === 'string' && s.thumbnail_url.trim() ? s.thumbnail_url : null,
    }))
    .filter((s) => s.media_url.length > 0);
}

function parseEntry(raw: Record<string, unknown>): CreatorCatalogEntry {
  return {
    user_id: String(raw.user_id ?? ''),
    nombre: typeof raw.nombre === 'string' && raw.nombre.trim() ? raw.nombre : 'Creador sin nombre',
    avatar_url: typeof raw.avatar_url === 'string' && raw.avatar_url.trim() ? raw.avatar_url : null,
    ciudad: typeof raw.ciudad === 'string' && raw.ciudad.trim() ? raw.ciudad : null,
    bio: typeof raw.bio === 'string' && raw.bio.trim() ? raw.bio : null,
    rango_edad: typeof raw.rango_edad === 'string' && raw.rango_edad.trim() ? raw.rango_edad : null,
    genero: typeof raw.genero === 'string' && raw.genero.trim() ? raw.genero : null,
    estilo_energia: typeof raw.estilo_energia === 'string' && raw.estilo_energia.trim() ? raw.estilo_energia : null,
    nichos_afines: parseStringArray(raw.nichos_afines),
    formatos_fuertes: parseStringArray(raw.formatos_fuertes),
    escenarios: parseStringArray(raw.escenarios),
    restricciones: parseStringArray(raw.restricciones),
    completitud: typeof raw.completitud === 'number' ? raw.completitud : 0,
    muestras: parseSamples(raw.muestras),
  };
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  const set = new Set(values.filter((v): v is string => !!v && v.trim().length > 0));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
}

export function useCreatorCatalog(clientId: string | null) {
  const [all, setAll] = useState<CreatorCatalogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [ciudad, setCiudad] = useState<string | null>(null);
  const [nicho, setNicho] = useState<string | null>(null);
  const [formato, setFormato] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!clientId) {
      setAll([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_creator_catalog_for_client' as any, {
        p_client_id: clientId,
      });
      if (rpcError) throw rpcError;

      const rows = Array.isArray(data) ? data : [];
      setAll(rows.map((row) => parseEntry(row as Record<string, unknown>)).filter((c) => c.user_id));
    } catch (err) {
      console.error('[useCreatorCatalog] Error cargando el catálogo:', err);
      setError(err instanceof Error ? err.message : 'No pudimos cargar los creadores disponibles.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ciudades = useMemo(() => uniqueSorted(all.map((c) => c.ciudad)), [all]);
  const nichos = useMemo(() => uniqueSorted(all.flatMap((c) => c.nichos_afines)), [all]);
  const formatos = useMemo(() => uniqueSorted(all.flatMap((c) => c.formatos_fuertes)), [all]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((c) => {
      if (q && !c.nombre.toLowerCase().includes(q)) return false;
      if (ciudad && c.ciudad !== ciudad) return false;
      if (nicho && !c.nichos_afines.includes(nicho)) return false;
      if (formato && !c.formatos_fuertes.includes(formato)) return false;
      return true;
    });
  }, [all, search, ciudad, nicho, formato]);

  const byId = useMemo(() => {
    const map = new Map<string, CreatorCatalogEntry>();
    for (const c of all) map.set(c.user_id, c);
    return map;
  }, [all]);

  return {
    all,
    filtered,
    byId,
    loading,
    error,
    search,
    setSearch,
    ciudad,
    setCiudad,
    nicho,
    setNicho,
    formato,
    setFormato,
    ciudades,
    nichos,
    formatos,
    refresh: cargar,
  };
}
