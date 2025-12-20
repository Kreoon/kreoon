import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const storageZone = Deno.env.get('BUNNY_STORAGE_ZONE')
    const storagePassword = Deno.env.get('BUNNY_STORAGE_PASSWORD')
    const cdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME')

    // Check if secrets are configured
    const missingSecrets: string[] = []
    if (!storageZone) missingSecrets.push('BUNNY_STORAGE_ZONE')
    if (!storagePassword) missingSecrets.push('BUNNY_STORAGE_PASSWORD')
    if (!cdnHostname) missingSecrets.push('BUNNY_CDN_HOSTNAME')

    if (missingSecrets.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'missing_secrets',
          message: `Faltan las siguientes credenciales: ${missingSecrets.join(', ')}`,
          details: { missingSecrets }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Testing Bunny Storage connection to zone: ${storageZone}`)

    // Test connection by listing root directory
    const testResponse = await fetch(
      `https://storage.bunnycdn.com/${storageZone}/`,
      {
        method: 'GET',
        headers: {
          'AccessKey': storagePassword!,
          'Accept': 'application/json'
        }
      }
    )

    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      console.error('Bunny Storage test failed:', testResponse.status, errorText)
      
      let errorMessage = 'Error de conexión con Bunny Storage'
      if (testResponse.status === 401) {
        errorMessage = 'Credenciales inválidas. Verifica BUNNY_STORAGE_ZONE y BUNNY_STORAGE_PASSWORD'
      } else if (testResponse.status === 404) {
        errorMessage = 'Zona de storage no encontrada. Verifica BUNNY_STORAGE_ZONE'
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'connection_failed',
          message: errorMessage,
          details: {
            status: testResponse.status,
            storageZone: storageZone,
            cdnHostname: cdnHostname
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse response to get file count
    let fileCount = 0
    try {
      const files = await testResponse.json()
      fileCount = Array.isArray(files) ? files.length : 0
    } catch {
      // If not JSON, that's okay - connection still works
    }

    console.log('Bunny Storage connection successful')

    return new Response(
      JSON.stringify({
        success: true,
        message: '¡Conexión exitosa con Bunny Storage!',
        details: {
          storageZone: storageZone,
          cdnHostname: cdnHostname,
          filesInRoot: fileCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Storage test error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'unexpected_error',
        message: error instanceof Error ? error.message : 'Error inesperado'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
