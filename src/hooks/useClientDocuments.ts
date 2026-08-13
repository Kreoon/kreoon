import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Documentos que el cliente adjunta ANTES de que generemos "Así entendimos tu
 * marca" — contratos, catálogos, brandbooks, lo que sea que ayude a
 * entenderlo mejor. Se suben junto con el formulario de inicio y se resumen
 * solos (edge function `process-client-document`).
 *
 * Tabla `client_documents`: id, organization_id, client_id, storage_path,
 * file_name, mime_type, file_size, alcance ('marca'|'estrategia'|'guiones'|
 * 'todo'), resumen (nullable), estado ('pendiente'|'procesando'|'listo'|
 * 'error'), error_detalle.
 *
 * Polling: solo mientras algún documento sigue 'pendiente' o 'procesando' —
 * el mismo patrón que `useClientPipeline` para el run.
 */

const BUCKET = 'client-documents';
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const POLL_MS = 4000;

export type DocumentoAlcance = 'marca' | 'estrategia' | 'guiones' | 'todo';
export type DocumentoEstado = 'pendiente' | 'procesando' | 'listo' | 'error';

export interface ClientDocument {
  id: string;
  organization_id: string;
  client_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  alcance: DocumentoAlcance;
  resumen: string | null;
  estado: DocumentoEstado;
  error_detalle: string | null;
  created_at: string;
}

/** mime type → extensión, para cuando el navegador no manda un mime confiable. */
const EXTENSIONES_PERMITIDAS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'];
const MIME_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

/** Accept del input file: por mime y por extensión, todo junto. */
export const ACCEPT_DOCUMENTOS = [...MIME_PERMITIDOS, ...EXTENSIONES_PERMITIDAS.map(ext => `.${ext}`)].join(',');

export function esTipoPermitido(file: File): boolean {
  if (MIME_PERMITIDOS.includes(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return !!ext && EXTENSIONES_PERMITIDAS.includes(ext);
}

export function useClientDocuments(clientId: string | null, organizationId: string | null) {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCount, setUploadingCount] = useState(0);
  const requestRef = useRef(0);

  const fetchAll = useCallback(async (options?: { silent?: boolean }) => {
    if (!clientId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    const requestId = ++requestRef.current;
    if (!options?.silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_documents' as any)
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (requestId !== requestRef.current) return;
      if (error) throw error;
      setDocuments((data as unknown as ClientDocument[]) ?? []);
    } catch (err) {
      console.error('[useClientDocuments] Error leyendo documentos:', err);
    } finally {
      if (requestId === requestRef.current && !options?.silent) setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const enProceso = documents.some(d => d.estado === 'pendiente' || d.estado === 'procesando');

  useEffect(() => {
    if (!enProceso || !clientId) return;
    const interval = setInterval(() => fetchAll({ silent: true }), POLL_MS);
    return () => clearInterval(interval);
  }, [enProceso, clientId, fetchAll]);

  /** Sube un archivo, crea su fila y dispara el resumen automático. */
  const subir = useCallback(async (file: File, alcance: DocumentoAlcance = 'todo') => {
    if (!clientId || !organizationId) throw new Error('No pudimos identificar tu cuenta. Recarga la página.');
    if (file.size > MAX_SIZE_BYTES) throw new Error('Ese archivo pesa más de 10MB. Prueba con uno más liviano.');
    if (!esTipoPermitido(file)) {
      throw new Error('Ese tipo de archivo no lo podemos leer. Usa PDF, Word, Excel o texto.');
    }

    setUploadingCount(c => c + 1);
    try {
      const ext = file.name.split('.').pop();
      const path = `${organizationId}/${clientId}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw new Error('No pudimos subir el archivo. Inténtalo de nuevo.');

      const { data: row, error: insertError } = await supabase
        .from('client_documents' as any)
        .insert({
          organization_id: organizationId,
          client_id: clientId,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
          alcance,
          estado: 'pendiente',
        })
        .select('*')
        .single();

      if (insertError || !row) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw new Error('No pudimos guardar tu documento. Inténtalo de nuevo.');
      }

      const nuevo = row as unknown as ClientDocument;
      setDocuments(prev => [nuevo, ...prev]);

      // Dispara el resumen automático. Si esto falla por red, el documento se
      // queda 'pendiente' — el polling lo vuelve a leer y, si el backend
      // nunca lo tomó, el cliente puede borrarlo y volver a intentar.
      void supabase.functions
        .invoke('process-client-document', { body: { document_id: nuevo.id } })
        .catch(err => console.error('[useClientDocuments] Error disparando el resumen:', err));

      return nuevo;
    } finally {
      setUploadingCount(c => c - 1);
    }
  }, [clientId, organizationId]);

  /** Cambia para qué sirve un documento ("Para todo", "Para mi marca", ...). */
  const cambiarAlcance = useCallback(async (documentId: string, alcance: DocumentoAlcance) => {
    const anterior = documents.find(d => d.id === documentId)?.alcance;
    setDocuments(prev => prev.map(d => (d.id === documentId ? { ...d, alcance } : d)));
    const { error } = await supabase.from('client_documents' as any).update({ alcance }).eq('id', documentId);
    if (error) {
      setDocuments(prev => prev.map(d => (d.id === documentId ? { ...d, alcance: anterior ?? d.alcance } : d)));
      throw new Error('No pudimos guardar ese cambio. Inténtalo de nuevo.');
    }
  }, [documents]);

  /** Borra el documento (storage + fila). */
  const eliminar = useCallback(async (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    if (!doc) return;
    setDocuments(prev => prev.filter(d => d.id !== documentId));
    try {
      await supabase.storage.from(BUCKET).remove([doc.storage_path]);
      const { error } = await supabase.from('client_documents' as any).delete().eq('id', documentId);
      if (error) throw error;
    } catch (err) {
      console.error('[useClientDocuments] Error borrando documento:', err);
      await fetchAll({ silent: true });
      throw new Error('No pudimos borrar el documento. Inténtalo de nuevo.');
    }
  }, [documents, fetchAll]);

  return {
    documents,
    loading,
    uploading: uploadingCount > 0,
    subir,
    cambiarAlcance,
    eliminar,
    refresh: fetchAll,
  };
}

export type UseClientDocumentsReturn = ReturnType<typeof useClientDocuments>;
