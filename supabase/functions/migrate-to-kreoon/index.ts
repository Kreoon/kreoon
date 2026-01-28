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
    // Verificar autenticación
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente origen (Lovable Cloud)
    const sourceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Cliente destino (Kreoon)
    const kreoonUrl = Deno.env.get('KREOON_SUPABASE_URL');
    const kreoonKey = Deno.env.get('KREOON_SERVICE_ROLE_KEY');

    // Debug: Log first 20 chars of URL and last 10 of key
    console.log('Kreoon URL:', kreoonUrl?.substring(0, 40));
    console.log('Kreoon Key ends with:', kreoonKey?.substring(kreoonKey.length - 10));
    console.log('Key contains service_role:', kreoonKey?.includes('service_role'));

    if (!kreoonUrl || !kreoonKey) {
      return new Response(JSON.stringify({ error: 'Credenciales de Kreoon no configuradas' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const destClient = createClient(kreoonUrl, kreoonKey);

    const { tables } = await req.json();
    const tablesToMigrate = tables || ['organizations', 'profiles', 'clients', 'products', 'content', 'organization_members', 'organization_member_roles'];

    const results: Record<string, { success: boolean; count?: number; error?: string }> = {};

    // Migrar en orden de dependencias
    const orderedTables = [
      'organizations',
      'profiles', 
      'clients',
      'products',
      'content',
      'organization_members',
      'organization_member_roles',
      'client_packages',
      'up_creadores',
      'up_creadores_totals',
      'up_editores',
      'up_editores_totals',
    ];

    for (const table of orderedTables) {
      if (!tablesToMigrate.includes(table)) continue;

      console.log(`Migrando tabla: ${table}`);
      
      try {
        // Leer datos del origen
        const { data: sourceData, error: readError } = await sourceClient
          .from(table)
          .select('*');

        if (readError) {
          results[table] = { success: false, error: readError.message };
          continue;
        }

        if (!sourceData || sourceData.length === 0) {
          results[table] = { success: true, count: 0 };
          continue;
        }

        // Reemplazar URLs de storage
        const migratedData = sourceData.map((row: Record<string, unknown>) => {
          const newRow = { ...row };
          for (const key of Object.keys(newRow)) {
            if (typeof newRow[key] === 'string' && (newRow[key] as string).includes('hfooshsteglylhvrpuka')) {
              newRow[key] = (newRow[key] as string).replace(/hfooshsteglylhvrpuka/g, kreoonUrl.split('//')[1].split('.')[0]);
            }
          }
          return newRow;
        });

        // Insertar en destino con upsert
        const { error: writeError } = await destClient
          .from(table)
          .upsert(migratedData, { onConflict: 'id' });

        if (writeError) {
          results[table] = { success: false, error: writeError.message };
        } else {
          results[table] = { success: true, count: migratedData.length };
        }
      } catch (tableError) {
        results[table] = { success: false, error: String(tableError) };
      }
    }

    const successCount = Object.values(results).filter(r => r.success).length;
    const failCount = Object.values(results).filter(r => !r.success).length;

    return new Response(JSON.stringify({
      message: `Migración completada: ${successCount} tablas exitosas, ${failCount} con errores`,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en migración:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
