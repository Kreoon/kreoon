# Regla de producto: sin redes, contacto ni enlaces externos en el portafolio público

Estado: vigente para esta fase (2026-10-01). Aplica a las plantillas Estudio UGC, Cine y Editorial, y a cualquier vista pública del creador.

## Qué no se publica

| Tipo | Ejemplos | Dónde puede colarse |
|---|---|---|
| Redes sociales | Instagram, TikTok, YouTube, X, LinkedIn, `@usuario` | Campos estructurados, bloques, biografía, títulos de piezas |
| Teléfono y WhatsApp | `+57 300…`, `wa.me/…`, `api.whatsapp.com` | Campo de teléfono, biografía, descripciones, botones |
| Correo | `nombre@dominio.com`, `mailto:` | Campo de correo, biografía, botones |
| Enlaces externos personalizados | Linktree, web propia, tiendas, formularios | Lista de enlaces, bloques de embed, HTML insertado |
| CTA de contacto | «Hablemos de tu marca», «Escríbeme por WhatsApp», «Enviar un correo» | Botones y textos de plantilla |

Sí se permite: **compartir el enlace del propio portafolio en Kreoon** (botón «Compartir portafolio»: Web Share API o copiar enlace). Compartir el portafolio no es publicar datos de contacto.

No se añaden formularios de contacto, candados, botones de compra ni avisos de «mejora tu plan». El futuro sistema de plugins, widgets o suscripciones no existe todavía y no se simula.

## Ocultar con CSS no protege nada

Si un dato llega al navegador, el visitante puede leerlo (código fuente, red, lectores de pantalla). La regla se aplica en el servidor:

1. **Respuesta pública por lista blanca.** La ruta pública obtiene solo columnas permitidas. Hoy `PUBLIC_CREATOR_PROFILE_COLUMNS` (`src/hooks/useCreatorPublicProfile.ts:14`) incluye `social_links`: en la integración hay que sacarlo de la lista pública (o devolverlo vacío desde una vista/RPC pública), no esconderlo en el componente.
2. **Vista o RPC pública dedicada.** Preferible a `select` directo con RLS pública, porque RLS filtra filas y no columnas (ver ledger, 2026-07-09). La vista pública no expone `whatsapp_phone`, correo, `social_links`, `payout_method` ni campos de pago.
3. **Bloques del constructor.** El bloque `social_links` (`src/components/profile-builder/types/profile-builder.ts`, marcado «Solo Premium») y los bloques con URL externa (`video_embed`, enlaces) no se renderizan ni se devuelven en la respuesta pública mientras dure la fase. Se filtran en la función que publica (`publish_profile_blocks` / `mcp_publish_portfolio_blocks`) y en la lectura pública, no solo en `PublicBlockRenderer`.
4. **Texto libre (biografía, títulos, descripciones).** Validación al guardar en el servidor (trigger o función de guardado) que detecte URLs, correos, teléfonos, `@usuario` y dominios de mensajería. Respuesta recomendada: rechazar con un mensaje claro en el editor («En esta fase no se pueden publicar redes ni datos de contacto»), en vez de borrar en silencio. Como segunda barrera, la lectura pública redacta lo que se haya colado.
5. **HTML o enlaces insertados.** El texto enriquecido público se sanea en servidor: sin `<a href>` externos, sin `mailto:`/`tel:`, sin iframes de terceros.

## No borrar lo que ya existe

- Los datos de contacto y redes que los creadores ya guardaron **se conservan en privado**: no se eliminan ni se sobrescriben. Solo dejan de aparecer en la respuesta pública.
- Si en el futuro un plugin o suscripción habilita alguno de estos campos, se activa por servidor (permiso explícito por creador), sin migrar ni reconstruir datos.
- No convertir esta restricción en un compromiso permanente en textos legales o de producto: es una regla de la fase actual.

## Cómo comprobarlo en la integración

- Pedir el perfil público sin sesión y revisar el JSON de red: no deben aparecer `social_links`, teléfono, correo ni URLs externas.
- Guardar una biografía con `wa.me/57300…`, `hola@ejemplo.com` y `@usuario`: el servidor debe rechazarla o la lectura pública debe redactarla.
- Publicar un perfil con un bloque `social_links` existente: la respuesta pública no lo incluye.
- Verificar que el editor sigue mostrando los datos privados ya guardados al dueño.
