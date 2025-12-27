import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting chat attachments cleanup...');

    // Get expired attachments (older than 8 days)
    const { data: expiredAttachments, error: fetchError } = await supabase
      .from('chat_attachment_metadata')
      .select('id, storage_path')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired attachments:', fetchError);
      throw fetchError;
    }

    if (!expiredAttachments || expiredAttachments.length === 0) {
      console.log('No expired attachments to clean up');
      return new Response(JSON.stringify({ 
        message: 'No expired attachments', 
        deleted: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${expiredAttachments.length} expired attachments`);

    // Delete files from storage
    const storagePaths = expiredAttachments.map(a => a.storage_path);
    const { error: storageError } = await supabase.storage
      .from('chat-attachments')
      .remove(storagePaths);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue to delete metadata even if storage deletion fails
    }

    // Delete metadata records
    const expiredIds = expiredAttachments.map(a => a.id);
    const { error: deleteError } = await supabase
      .from('chat_attachment_metadata')
      .delete()
      .in('id', expiredIds);

    if (deleteError) {
      console.error('Error deleting metadata:', deleteError);
      throw deleteError;
    }

    // Also update chat_messages to clear attachment URLs for deleted files
    for (const attachment of expiredAttachments) {
      await supabase
        .from('chat_messages')
        .update({ 
          attachment_url: null, 
          attachment_name: '[Archivo expirado]',
          attachment_type: null,
          attachment_size: null 
        })
        .eq('attachment_url', attachment.storage_path);
    }

    console.log(`Successfully cleaned up ${expiredAttachments.length} attachments`);

    return new Response(JSON.stringify({ 
      message: 'Cleanup completed', 
      deleted: expiredAttachments.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});