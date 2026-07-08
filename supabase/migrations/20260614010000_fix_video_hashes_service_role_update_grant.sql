-- Fix: bunny-portfolio-upload action 'save-hash' usa .upsert(..., { onConflict: 'file_hash' }),
-- que genera INSERT ... ON CONFLICT DO UPDATE. PostgreSQL exige privilegio UPDATE sobre la tabla
-- para esa sentencia (aunque no haya conflicto). service_role solo tenia INSERT + SELECT, por lo que
-- el upsert fallaba con "permission denied for table video_hashes" -> la edge function devolvia 500
-- y NINGUN hash de video se guardaba (dedup roto). El 500 era visible en consola del editor al subir.
--
-- Nota: el save-hash es non-blocking en el cliente (fire-and-forget), por lo que este 500 NO impedia
-- la subida del video a Bunny ni la persistencia de content.video_urls; solo rompia el dedup.

GRANT UPDATE, DELETE ON public.video_hashes TO service_role;
