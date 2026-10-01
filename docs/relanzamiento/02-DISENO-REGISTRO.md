# 02 · Diseño del registro por organización

## Principios (todos verificados por pruebas)

1. **El servidor es la autoridad.** La organización se resuelve por slug (o alias) con `get_registration_org`; el rol lo fija
   `complete_creator_signup` (siempre `content_creator`); el cliente solo envía el slug, los documentos que aceptó y atribución filtrada.
   El único `user_metadata` que se escribe al crear la cuenta es `full_name`.
2. **Visitar una URL no concede membresía ni cambia de contexto.** La membresía se crea solo en `complete_creator_signup`, que exige
   sesión, organización activa con inscripción abierta y consentimientos. Una identidad con membresías en otras organizaciones recibe
   `needs_confirmation` y solo se incorpora con una acción explícita (`p_explicit=true`), creando únicamente membresía/rol.
3. **Sin fallback silencioso.** Slug inválido → `not_found`; organización bloqueada/eliminada → `inactive`; inscripción cerrada → `closed`.
   Un dominio sin organización asociada → estado "no se pudo identificar la organización", nunca UGC Colombia.
4. **Idempotencia.** Reintentos devuelven `already_member`; `UNIQUE(org,user)`, `UNIQUE(org,user,role)` y `UNIQUE(user,document)` impiden duplicados.
5. **Contexto que sobrevive a correo/OAuth/recargas/otro dispositivo:** el slug viaja en la RUTA (`/registro/:slug/continuar`), que es el
   `emailRedirectTo` y el `redirectTo` de OAuth. No depende de `localStorage` ni de `user_metadata`. `sessionStorage` (mismo navegador)
   solo permite continuar solo; en otro dispositivo el servidor sigue siendo la autoridad y se pide una confirmación explícita.
6. **Destinos de retorno** (`next`): solo rutas internas (`sanitizeReturnTo`): rechaza esquemas, `//`, `\`, control, `%2F%2F`, traversal a
   `/auth`; bloquea rutas de auth/registro (bucles). Única excepción: `/registro/:slug/continuar` para volver tras iniciar sesión.

## Máquina de estados

```
/registro/:slug ──(org: not_found|inactive|closed)──▶ tarjeta de estado (sin crear nada)
      │ open
      ├─ Google ──▶ OAuth ──▶ /registro/:slug/continuar
      └─ correo ──▶ signUp ─┬─ sesión inmediata ─────────────▶ /continuar
                            ├─ verificar correo (reenvío con cooldown 60 s; "me equivoqué de correo")
                            └─ cuenta existente ("Ya tienes una cuenta": iniciar sesión / otro correo)
/registro/:slug/continuar
      ├─ sin sesión ▶ "Inicia sesión" (vuelve aquí) | "Crear cuenta"
      ├─ enlace vencido ▶ pide correo y reenvía
      ├─ get_my_creator_signup_state (solo lectura)
      │    ├─ ya miembro ▶ /bienvenida
      │    ├─ mismo navegador + sin otras membresías ▶ complete_creator_signup ▶ /bienvenida
      │    └─ otro dispositivo / otras membresías ▶ tarjeta de confirmación explícita (+ consentimientos pendientes)
      └─ éxito solo si status ∈ {joined, already_member}
/bienvenida ▶ (gate) CreatorOnboardingWizard: nombre público → foto → tipo de contenido → "Crear mi portafolio" | "Entrar a mi espacio"
```

## Consentimientos

Fuente de verdad: `legal_consent_requirements` (`trigger_event='registration'`) vía `list_registration_documents('talent')`. Hoy son **5
documentos** para creadores: Declaración de Edad, Términos Generales, Acuerdo de Talento, Política de Moderación y DMCA. La versión, el hash,
la fecha, la IP y el agente los escribe el servidor (`user_legal_consents`, método `registration` u `onboarding`). **No se inventaron
aceptaciones ni se cambió contenido jurídico.** El formulario externo de ugccolombia.co no muestra documentos versionados, por eso su
puente no registra consentimientos: se piden en el onboarding.

> **Revisar con jurídico:** los HTML de `age_declaration` y `general_terms` miden ~48 caracteres (parecen *placeholders*). Y hay doble contrato:
> `talent_agreement` en el registro y `creator_agreement` (modal bloqueante de `RoleLegalGateProvider`) al asignarse el rol.

## Onboarding único

`OnboardingGateProvider` (ya existía y tapa toda la app hasta completar) decide el asistente con `getOnboardingTrack`:
`creator` → `CreatorOnboardingWizard`; sin roles ni tipo cliente → registro de creadores (**ya no se ofrece "Marca/Empresa"**);
clientes/marcas existentes y demás roles → Nova (sin cambios). Se guarda cada paso al instante (`save_creator_onboarding_progress`),
es omitible y reanudable. **Nada se publica:** crear cuenta, completar perfil y publicar portafolio son hechos distintos; la
visibilidad en el marketplace la activa `publish_profile_blocks` (acto explícito del creador).
`finish_creator_onboarding` exige los consentimientos de registro y fija `user_type='talent'` (cierra P3).

## Destino post-login

`src/lib/routing/postAuth.ts` es la única fuente (Auth y ProtectedRoute dejan de discrepar). Conserva el aterrizaje histórico por rol,
valida `next` y, sin roles, lleva al registro de creadores. Además: `Auth` ya no fija `current_organization_id` por el dominio si la
persona no es miembro de esa organización.

## Organizaciones futuras

Crear una organización es solo del propietario (`is_platform_root`, RLS). Una organización nueva nace **vacía** (la tabla, sus
columnas y `complete_creator_signup` no heredan datos). Hay `is_default_registration_org` (única) para el dominio raíz y
`organization_slug_aliases` para enlaces antiguos. **No se construyó** el flujo comercial de alta.
