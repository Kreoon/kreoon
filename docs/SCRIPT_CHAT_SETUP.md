# Configuración de script-chat (Mejorador de guiones)

El mejorador de guiones usa la Edge Function `script-chat` desplegada en **Kreoon Supabase** (wjkbqcrxwsmvtxmqgiqc).

## 1. Desplegar la función

Desde la raíz del proyecto:

```bash
# Opción A: Usando el script (Windows PowerShell)
./scripts/deploy-script-chat.ps1

# Opción B: Comando directo
npx supabase functions deploy script-chat --project-ref wjkbqcrxwsmvtxmqgiqc
```

**Requisito previo:** Iniciar sesión en Supabase CLI:
```bash
npx supabase login
```

## 2. Configurar API Keys

1. Ve a [Supabase Dashboard - Kreoon](https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/settings/functions)
2. Sección **Edge Functions** → **Secrets** (o Project Settings → Edge Functions)
3. Agrega estos secrets:

| Secret | Obligatorio | Descripción |
|--------|-------------|-------------|
| `GOOGLE_AI_API_KEY` | ✅ Sí | API key de Google AI (Gemini). [Crear aquí](https://aistudio.google.com/app/apikey) |
| `OPENAI_API_KEY` | Recomendado | Fallback cuando Gemini tiene rate limit. [Crear aquí](https://platform.openai.com/api-keys) |
| `ANTHROPIC_API_KEY` | Opcional | Fallback adicional (Claude). [Crear aquí](https://console.anthropic.com/) |
| `PERPLEXITY_API_KEY` | Opcional | Para "Incluir datos actuales" en el chat. [Crear aquí](https://www.perplexity.ai/settings/api) |

### Cómo obtener las API keys

**Google AI (Gemini):**
1. https://aistudio.google.com/app/apikey
2. Create API key
3. Copia la clave y pégala en `GOOGLE_AI_API_KEY`

**OpenAI (GPT):**
1. https://platform.openai.com/api-keys
2. Create new secret key
3. Copia la clave y pégala en `OPENAI_API_KEY`

**Anthropic (Claude):**
1. https://console.anthropic.com/
2. API Keys → Create Key
3. Copia la clave y pégala en `ANTHROPIC_API_KEY`

**Perplexity:**
1. https://www.perplexity.ai/settings/api
2. Generate API Key
3. Copia la clave y pégala en `PERPLEXITY_API_KEY`

## 3. Verificar

Tras desplegar y configurar:
1. Abre un contenido en el tablero
2. Pestaña Scripts → Chat de IA
3. Escribe una mejora (ej: "Hazlo más corto")
4. Debería responder sin error 429

## Solución de problemas

- **429 Too Many Requests:** Configura al menos 2 proveedores (Gemini + OpenAI) para fallback automático.
- **402 Insufficient tokens** (pero la org tiene tokens): La función `deduct_ai_tokens` podría no existir en la base de datos. Ejecuta en Supabase SQL Editor (Kreoon):

```sql
-- Crear la función deduct_ai_tokens si no existe
CREATE OR REPLACE FUNCTION public.deduct_ai_tokens(
  p_org_id UUID, p_cost INTEGER, p_module_key TEXT DEFAULT NULL, p_action TEXT DEFAULT NULL,
  p_ai_provider TEXT DEFAULT NULL, p_ai_model TEXT DEFAULT NULL, p_input_tokens INTEGER DEFAULT NULL,
  p_output_tokens INTEGER DEFAULT NULL, p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_deduct_from_remaining INTEGER;
  v_deduct_from_purchased INTEGER;
  v_new_remaining INTEGER;
  v_new_purchased INTEGER;
BEGIN
  SELECT tokens_remaining, purchased_tokens, tokens_used_this_period INTO v_row
  FROM public.organization_ai_tokens WHERE organization_id = p_org_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'tokens_remaining', 0, 'error', 'no_token_record');
  END IF;
  IF (v_row.tokens_remaining + v_row.purchased_tokens) < p_cost THEN
    RETURN jsonb_build_object('ok', false, 'tokens_remaining', v_row.tokens_remaining + v_row.purchased_tokens);
  END IF;
  v_deduct_from_remaining := LEAST(v_row.tokens_remaining, p_cost);
  v_deduct_from_purchased := p_cost - v_deduct_from_remaining;
  v_new_remaining := v_row.tokens_remaining - v_deduct_from_remaining;
  v_new_purchased := GREATEST(0, v_row.purchased_tokens - v_deduct_from_purchased);
  UPDATE public.organization_ai_tokens
  SET tokens_remaining = v_new_remaining, purchased_tokens = v_new_purchased,
      tokens_used_this_period = tokens_used_this_period + p_cost, updated_at = NOW()
  WHERE organization_id = p_org_id;
  INSERT INTO public.ai_token_transactions (organization_id, type, tokens_amount, module_key, action, ai_provider, ai_model, input_tokens, output_tokens, description)
  VALUES (p_org_id, 'usage', -p_cost, p_module_key, p_action, p_ai_provider, p_ai_model, p_input_tokens, p_output_tokens, p_description);
  RETURN jsonb_build_object('ok', true, 'tokens_remaining', v_new_remaining + v_new_purchased);
END;
$$;
GRANT EXECUTE ON FUNCTION public.deduct_ai_tokens(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO service_role;
```

- **402 sin tokens:** Admin puede agregar tokens desde Configuración → Tokens IA.
- **Error de despliegue:** Ejecuta `npx supabase login` y verifica el project-ref.
