import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingContent {
  user_email: string;
  user_name: string;
  content_titles: string[];
  role: 'client' | 'editor' | 'creator';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting daily reminders job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get clients with content pending review
    const { data: clientContent, error: clientError } = await supabase
      .from('content')
      .select(`
        id,
        title,
        client_id,
        clients!content_client_id_fkey (
          id,
          name,
          user_id
        )
      `)
      .eq('status', 'review')
      .not('client_id', 'is', null);

    if (clientError) {
      console.error("Error fetching client content:", clientError);
    }

    // Get editors with content pending editing
    const { data: editorContent, error: editorError } = await supabase
      .from('content')
      .select(`
        id,
        title,
        editor_id
      `)
      .in('status', ['recorded', 'editing', 'issue'])
      .not('editor_id', 'is', null);

    if (editorError) {
      console.error("Error fetching editor content:", editorError);
    }

    // Get creators with content pending
    const { data: creatorContent, error: creatorError } = await supabase
      .from('content')
      .select(`
        id,
        title,
        creator_id
      `)
      .in('status', ['assigned', 'script_approved', 'recording'])
      .not('creator_id', 'is', null);

    if (creatorError) {
      console.error("Error fetching creator content:", creatorError);
    }

    const emailsToSend: PendingContent[] = [];

    // Process clients
    if (clientContent && clientContent.length > 0) {
      const clientMap = new Map<string, { name: string; userId: string; titles: string[] }>();
      
      for (const content of clientContent) {
        const client = content.clients as any;
        if (client?.user_id) {
          const existing = clientMap.get(client.user_id);
          if (existing) {
            existing.titles.push(content.title);
          } else {
            clientMap.set(client.user_id, {
              name: client.name,
              userId: client.user_id,
              titles: [content.title]
            });
          }
        }
      }

      for (const [userId, data] of clientMap) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single();

        if (profile?.email) {
          emailsToSend.push({
            user_email: profile.email,
            user_name: profile.full_name || data.name,
            content_titles: data.titles,
            role: 'client'
          });
        }
      }
    }

    // Process editors
    if (editorContent && editorContent.length > 0) {
      const editorMap = new Map<string, string[]>();
      
      for (const content of editorContent) {
        if (content.editor_id) {
          const existing = editorMap.get(content.editor_id);
          if (existing) {
            existing.push(content.title);
          } else {
            editorMap.set(content.editor_id, [content.title]);
          }
        }
      }

      for (const [editorId, titles] of editorMap) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', editorId)
          .single();

        if (profile?.email) {
          emailsToSend.push({
            user_email: profile.email,
            user_name: profile.full_name,
            content_titles: titles,
            role: 'editor'
          });
        }
      }
    }

    // Process creators
    if (creatorContent && creatorContent.length > 0) {
      const creatorMap = new Map<string, string[]>();
      
      for (const content of creatorContent) {
        if (content.creator_id) {
          const existing = creatorMap.get(content.creator_id);
          if (existing) {
            existing.push(content.title);
          } else {
            creatorMap.set(content.creator_id, [content.title]);
          }
        }
      }

      for (const [creatorId, titles] of creatorMap) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', creatorId)
          .single();

        if (profile?.email) {
          emailsToSend.push({
            user_email: profile.email,
            user_name: profile.full_name,
            content_titles: titles,
            role: 'creator'
          });
        }
      }
    }

    console.log(`Sending ${emailsToSend.length} reminder emails...`);

    const results = [];
    for (const emailData of emailsToSend) {
      const subject = getSubjectByRole(emailData.role);
      const html = generateEmailHtml(emailData);

      try {
        const { data, error } = await resend.emails.send({
          from: "Creartor Studio <onboarding@resend.dev>",
          to: [emailData.user_email],
          subject: subject,
          html: html,
        });

        if (error) {
          console.error(`Error sending email to ${emailData.user_email}:`, error);
          results.push({ email: emailData.user_email, success: false, error: error.message });
        } else {
          console.log(`Email sent to ${emailData.user_email}`);
          results.push({ email: emailData.user_email, success: true });
        }
      } catch (err) {
        console.error(`Exception sending email to ${emailData.user_email}:`, err);
        results.push({ email: emailData.user_email, success: false, error: String(err) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Daily reminders completed: ${successCount}/${results.length} emails sent successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: results.length,
        details: results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in daily-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getSubjectByRole(role: 'client' | 'editor' | 'creator'): string {
  switch (role) {
    case 'client':
      return '📋 Tienes contenido pendiente por revisar';
    case 'editor':
      return '✂️ Tienes contenido pendiente por editar';
    case 'creator':
      return '🎬 Tienes contenido pendiente por grabar';
  }
}

function generateEmailHtml(data: PendingContent): string {
  const roleMessages = {
    client: {
      title: 'Contenido Pendiente de Revisión',
      description: 'Los siguientes contenidos están esperando tu aprobación:',
      action: 'revisar y aprobar'
    },
    editor: {
      title: 'Contenido Pendiente de Edición',
      description: 'Los siguientes contenidos están asignados a ti para edición:',
      action: 'editar'
    },
    creator: {
      title: 'Contenido Pendiente de Grabación',
      description: 'Los siguientes contenidos están asignados a ti:',
      action: 'grabar'
    }
  };

  const msg = roleMessages[data.role];
  const contentList = data.content_titles
    .map(title => `<li style="margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 4px;">${title}</li>`)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${msg.title}</h1>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Hola <strong>${data.user_name}</strong>,
        </p>
        
        <p style="font-size: 15px; color: #555;">
          ${msg.description}
        </p>
        
        <ul style="list-style: none; padding: 0; margin: 20px 0;">
          ${contentList}
        </ul>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          Tienes <strong>${data.content_titles.length}</strong> contenido(s) pendiente(s) por ${msg.action}.
        </p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://app.kreoon.com/board" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Ver Tablero
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
          Este es un recordatorio automático de Creartor Studio.<br>
          Por favor no respondas a este correo.
        </p>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
