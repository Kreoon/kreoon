import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente origen (Legacy DB)
    const sourceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Cliente destino (Kreoon)
    const kreoonUrl = Deno.env.get('KREOON_SUPABASE_URL');
    const kreoonKey = Deno.env.get('KREOON_SERVICE_ROLE_KEY');

    if (!kreoonUrl || !kreoonKey) {
      return new Response(JSON.stringify({ error: 'Credenciales de Kreoon no configuradas' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const destClient = createClient(kreoonUrl, kreoonKey);

    const { buckets } = await req.json();
    const bucketsToMigrate = buckets || ['avatars', 'organizations', 'portfolio'];

    const results: Record<string, { success: boolean; count?: number; error?: string; files?: string[] }> = {};

    for (const bucketName of bucketsToMigrate) {
      console.log(`Migrando bucket: ${bucketName}`);
      
      try {
        // Verificar si el bucket existe en destino, si no, crearlo
        const { data: destBuckets } = await destClient.storage.listBuckets();
        const bucketExists = destBuckets?.some(b => b.name === bucketName);
        
        if (!bucketExists) {
          const { error: createError } = await destClient.storage.createBucket(bucketName, {
            public: true
          });
          if (createError) {
            console.log(`Bucket ${bucketName} ya existe o error:`, createError.message);
          }
        }

        // Listar archivos en el bucket origen
        const { data: files, error: listError } = await sourceClient.storage
          .from(bucketName)
          .list('', { limit: 1000 });

        if (listError) {
          results[bucketName] = { success: false, error: listError.message };
          continue;
        }

        if (!files || files.length === 0) {
          results[bucketName] = { success: true, count: 0, files: [] };
          continue;
        }

        const migratedFiles: string[] = [];
        let errorCount = 0;

        // Función recursiva para listar todos los archivos incluyendo carpetas
        async function listAllFiles(prefix: string): Promise<string[]> {
          const allPaths: string[] = [];
          const { data: items } = await sourceClient.storage
            .from(bucketName)
            .list(prefix, { limit: 1000 });

          if (!items) return allPaths;

          for (const item of items) {
            const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
            if (item.id) {
              // Es un archivo
              allPaths.push(fullPath);
            } else {
              // Es una carpeta, recursivamente listar
              const subFiles = await listAllFiles(fullPath);
              allPaths.push(...subFiles);
            }
          }
          return allPaths;
        }

        const allFilePaths = await listAllFiles('');
        console.log(`Encontrados ${allFilePaths.length} archivos en ${bucketName}`);

        for (const filePath of allFilePaths) {
          try {
            // Descargar del origen
            const { data: fileData, error: downloadError } = await sourceClient.storage
              .from(bucketName)
              .download(filePath);

            if (downloadError || !fileData) {
              console.log(`Error descargando ${filePath}:`, downloadError?.message);
              errorCount++;
              continue;
            }

            // Subir al destino
            const { error: uploadError } = await destClient.storage
              .from(bucketName)
              .upload(filePath, fileData, {
                upsert: true,
                contentType: fileData.type
              });

            if (uploadError) {
              console.log(`Error subiendo ${filePath}:`, uploadError.message);
              errorCount++;
            } else {
              migratedFiles.push(filePath);
            }
          } catch (fileError) {
            console.log(`Error procesando ${filePath}:`, fileError);
            errorCount++;
          }
        }

        results[bucketName] = {
          success: errorCount === 0,
          count: migratedFiles.length,
          files: migratedFiles.slice(0, 10), // Solo mostrar primeros 10
          error: errorCount > 0 ? `${errorCount} archivos con error` : undefined
        };

      } catch (bucketError) {
        results[bucketName] = { success: false, error: String(bucketError) };
      }
    }

    return new Response(JSON.stringify({
      message: 'Migración de storage completada',
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en migración de storage:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
