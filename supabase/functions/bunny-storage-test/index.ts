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
    const bunnyApiKey = Deno.env.get('BUNNY_API_KEY')
    const bunnyLibraryId = Deno.env.get('BUNNY_LIBRARY_ID')

    // Check if secrets are configured
    const missingSecrets: string[] = []
    if (!bunnyApiKey) missingSecrets.push('BUNNY_API_KEY')
    if (!bunnyLibraryId) missingSecrets.push('BUNNY_LIBRARY_ID')

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

    console.log(`Testing Bunny Stream connection to library: ${bunnyLibraryId}`)

    // Test connection by listing videos in the library
    const testResponse = await fetch(
      `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos?page=1&itemsPerPage=1`,
      {
        method: 'GET',
        headers: {
          'AccessKey': bunnyApiKey!,
          'Accept': 'application/json'
        }
      }
    )

    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      console.error('Bunny Stream test failed:', testResponse.status, errorText)
      
      let errorMessage = 'Error de conexión con Bunny Stream'
      if (testResponse.status === 401) {
        errorMessage = 'Credenciales inválidas. Verifica BUNNY_API_KEY y BUNNY_LIBRARY_ID'
      } else if (testResponse.status === 404) {
        errorMessage = 'Librería no encontrada. Verifica BUNNY_LIBRARY_ID'
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'connection_failed',
          message: errorMessage,
          details: {
            status: testResponse.status,
            libraryId: bunnyLibraryId
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse response to get video count
    let videoCount = 0
    try {
      const data = await testResponse.json()
      videoCount = data.totalItems || 0
    } catch {
      // If not JSON, that's okay - connection still works
    }

    console.log('Bunny Stream connection successful')

    return new Response(
      JSON.stringify({
        success: true,
        message: '¡Conexión exitosa con Bunny Stream!',
        details: {
          libraryId: bunnyLibraryId,
          totalVideos: videoCount
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
