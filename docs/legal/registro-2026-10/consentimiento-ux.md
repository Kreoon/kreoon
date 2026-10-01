# Diseño del bloque de consentimiento del registro

> Diseño propuesto. Los textos legales que enlaza son **borradores pendientes de revisión jurídica**.

## 1. Objetivos

1. Dos documentos, dos casillas, **ninguna marcada** por defecto.
2. La persona puede leer los documentos **sin perder lo que escribió** en el formulario.
3. Antes de las casillas, un **aviso breve** con responsable, finalidad y derechos (aviso de privacidad, Decreto 1074 de 2015, art. 2.2.2.25.3.3).
4. Un único botón: **«Crear mi cuenta»**.
5. Con Google, la aceptación se exige **antes** de redirigir y se vuelve a verificar en el servidor antes de activar el rol; si falta, se pide en `/continuar` sin perder la organización de destino.
6. Lo que se registra es exactamente lo que se mostró (versión, huella SHA-256 y texto de la casilla).

## 2. Maqueta (móvil primero)

```
┌──────────────────────────────────────────────┐
│  Únete a {Organización} como creador          │
│  [ Continuar con Google ]                     │
│  ──────── o con tu correo ────────            │
│  Nombre        [__________________]           │
│  Correo        [__________________]           │
│  Contraseña    [__________________] (👁)      │
│                                              │
│  ┌ Aviso de privacidad ────────────────────┐ │
│  │ {Responsable} trata tus datos para crear │ │
│  │ y gestionar tu cuenta de creador en      │ │
│  │ {Organización}. Puedes conocer,          │ │
│  │ actualizar, rectificar y suprimir tus    │ │
│  │ datos y revocar tu autorización          │ │
│  │ escribiendo a {canal}. Más detalles en   │ │
│  │ la Política de privacidad.               │ │
│  └──────────────────────────────────────────┘ │
│                                              │
│  [ ] Declaro que soy mayor de edad y acepto   │
│      el Acuerdo del creador y los términos    │
│      de servicio.                             │
│      Leer el acuerdo · v1.0                   │
│                                              │
│  [ ] Autorizo el tratamiento de mis datos     │
│      para crear y gestionar mi cuenta de      │
│      creador, según la Política de            │
│      privacidad.                              │
│      Leer la política · v2.0                  │
│                                              │
│  [        Crear mi cuenta        ]            │
└──────────────────────────────────────────────┘
```

## 3. Textos exactos (versión 1 del bloque)

- **Aviso previo** (componente `PrivacyNotice`):
  «{Responsable} trata tus datos para crear y gestionar tu cuenta de creador en {Organización}. Puedes conocer, actualizar, rectificar y suprimir tus datos y revocar tu autorización escribiendo a {canal}. Más detalles en la Política de privacidad.»
  `{Responsable}` y `{canal}` salen de la versión publicada de la política (campo `notice_controller` / `notice_contact`), no del código. Mientras sean **[PENDIENTE]**, el bloque no se puede publicar.
- **Casilla 1** (`creator_terms`):
  «Declaro que soy mayor de edad y acepto el Acuerdo del creador y los términos de servicio.»
- **Casilla 2** (`privacy_policy`):
  «Autorizo el tratamiento de mis datos para crear y gestionar mi cuenta de creador, según la Política de privacidad.»
  Ajuste respecto del texto del encargo: «mi cuenta» → «mi cuenta de creador», que es la única finalidad del registro. Si el abogado confirma finalidades adicionales obligatorias (por ejemplo, atribución de campañas), se nombran aquí o se separan en casilla opcional.
- Cada texto de casilla se guarda en la versión del documento (`acceptance_statement`) y su huella entra en la evidencia. Cambiar una coma del texto = nueva versión.

## 4. Comportamiento

| Situación | Comportamiento |
|---|---|
| Carga de la página | Se piden las versiones vigentes (`get_creator_signup_documents_v2`). Mientras cargan, las casillas y el botón están deshabilitados con «Cargando documentos…». Si fallan, mensaje y «Reintentar»; **no** se permite crear la cuenta con la lista vacía (hoy sí: `OrganizationRegistrationPage.tsx:105-106`). |
| Leer un documento | Enlace «Leer el acuerdo» abre una **hoja lateral (Sheet) en escritorio / pantalla completa en móvil** con el texto renderizado de la versión exacta, sin navegar. El estado del formulario vive en el componente padre, así que no se pierde. Alternativa siempre disponible: «Abrir en una pestaña nueva» (URL permanente `/legal/creator_terms/1.0`). |
| Dentro del visor | Título, versión, fecha de vigencia, huella SHA-256 abreviada, índice navegable, botones **«Descargar (.md)»**, **«Copiar texto»** e **«Imprimir»**. Botón «Volver al registro» que devuelve el foco al enlace que lo abrió. |
| No marcar casillas y pulsar «Crear mi cuenta» | No se envía. Mensaje junto a cada casilla faltante («Necesitas aceptar el acuerdo para crear tu cuenta» / «Necesitamos tu autorización para crear tu cuenta»), con `aria-invalid` y foco en la primera casilla faltante. |
| Aceptación parcial | Igual que arriba, solo en la casilla faltante. Nada se envía al servidor. |
| «Continuar con Google» | Mismas validaciones antes de redirigir. Se guarda en `sessionStorage` la intención: slug, ids y huellas de las versiones, texto de casillas, `client_request_id` (UUID) y `nonce`; se pasa el `nonce` en `redirectTo`. |
| Vuelta de Google o del correo (`/continuar`) | El servidor compara las versiones de la intención con las vigentes. Si coinciden y el `nonce` coincide, registra la aceptación (método derivado del token: `google_oauth` o `email_password`) y crea la membresía **en la misma transacción**. Si no hay intención, la versión cambió o el `nonce` no coincide, se muestra **el mismo bloque de dos casillas sin marcar** con el botón «Unirme a {Organización}». La organización de destino viaja en la ruta (`/registro/:slug/continuar`), así que se conserva. |
| Versión obsoleta durante el registro | El servidor responde `document_version_outdated` con las versiones vigentes. La interfaz muestra: «Actualizamos {documento} mientras te registrabas. Revisa la nueva versión y vuelve a aceptar.» Casillas desmarcadas, datos del formulario intactos. |
| Fallo al registrar la aceptación | No hay pantalla de éxito ni membresía (transacción única). Mensaje: «No pudimos guardar tu aceptación. Tu cuenta está a salvo; inténtalo de nuevo.» con botón «Reintentar», que reutiliza el mismo `client_request_id` (idempotente). |
| Ya aceptó las versiones vigentes (otro dispositivo) | Las casillas no se muestran; se muestra «Ya aceptaste el Acuerdo v1.0 y la Política v2.0 el {fecha}.» con enlaces. |
| Persona con otra membresía | Igual que hoy (`ContinueSignup.tsx:215-217`), más el bloque de dos casillas si faltan aceptaciones. |

## 5. Accesibilidad

- Cada casilla es un `Checkbox` de Radix con `<label htmlFor>` que cubre **todo** el texto; los enlaces van **fuera** del `<label>`, en una línea aparte, para que pulsar el enlace no marque la casilla (problema del diseño modificado actual, que mezcla `label` y `button` en el mismo párrafo: `ConsentBlock.tsx:42-60`).
- Los errores se asocian con `aria-describedby`; el resumen de errores tiene `role="alert"`.
- El visor es un `Dialog`/`Sheet` de Radix: atrapa el foco, cierra con `Esc`, devuelve el foco al disparador, título como `DialogTitle`.
- Área táctil mínima de 44 × 44 px para casillas y enlaces; texto de 16 px en móvil; contraste AA (ver `npm run check:contrast`).
- El texto legal se renderiza como HTML semántico (encabezados `h2/h3`, listas), no como imagen ni PDF.
- Orden de tabulación: campos → aviso (enlace) → casilla 1 → enlace 1 → casilla 2 → enlace 2 → botón.

## 6. Lo que se registra por cada casilla

`user_id`, organización de contexto, clave del documento, versión exacta, id de la versión (referencia inmutable), huella SHA-256 del contenido, huella del texto de la casilla, tipo (`contract` / `data_processing_authorization`), método (`email_password` / `google_oauth`, derivado del token en el servidor), flujo (`creator_signup` / `creator_signup_continue`), `client_request_id`, IP y navegador si están disponibles, `now()` del servidor.

**Una casilla no es una firma digital certificada** (Ley 527 de 1999 y su reglamentación distinguen la firma digital certificada); es un registro de aceptación electrónica cuya fuerza probatoria depende de la integridad del registro. Por eso la evidencia es de solo inserción y la escribe solo el servidor.

## 7. Fuera del registro

- **Autorización opcional de imagen para promocionar la plataforma:** en la configuración del perfil, desmarcada, con su propio texto versionado y botón «Retirar autorización». No aparece en el registro para no condicionar el alta.
- **Analítica:** sigue en el aviso de cookies.
