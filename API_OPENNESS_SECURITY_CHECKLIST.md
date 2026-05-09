# API Openness & Security Checklist — Kreoon MCP

**Versión:** 1.0  
**Fecha:** 2026-05-08  
**Revisión:** Antes de cada deploy a producción

---

## 1. Pre-Deployment: Validación de API Keys

### 1.1 Estructura de Keys
- [ ] Formato `sk-kreoon-{uuid-v4}` respetado
- [ ] Solo se almacena el hash SHA-256 (`key_hash`), nunca el valor en texto plano
- [ ] Hash generado con `crypto.createHash('sha256')`, no MD5 ni SHA-1
- [ ] La key plana se muestra **una sola vez** al creador y nunca vuelve a recuperarse
- [ ] Las keys de prueba/desarrollo tienen prefijo `sk-kreoon-test-`

### 1.2 Scopes y Permisos
- [ ] Cada key tiene el array `scopes` mínimo necesario (principio de menor privilegio)
- [ ] Scopes de escritura (`scripts:write`, `social:publish`) requieren aprobación explícita del `admin`
- [ ] Las keys de clientes (`client`) solo pueden tener scopes `read`
- [ ] La validación de scopes ocurre **en la Edge Function**, no solo en el cliente

### 1.3 Ciclo de Vida
- [ ] `expires_at` definido (máximo 1 año para producción, 7 días para test)
- [ ] Rutina de limpieza para keys expiradas ejecutándose diariamente (`cleanup-expired-stories` pattern)
- [ ] `revoked = true` bloquea inmediatamente, sin depender del TTL de caché
- [ ] Notificación por email 7 días antes del vencimiento de keys activas

---

## 2. Rate Limiting

### 2.1 Límites por Tier
- [ ] Free: 100 req/hora implementado y activo
- [ ] Pro: 1000 req/hora
- [ ] Enterprise: 5000 req/hora
- [ ] Sin tier asignado → aplica límite Free por defecto

### 2.2 Ventanas de Rate Limit
- [ ] Ventana deslizante de 60 segundos para burst protection
- [ ] Headers de respuesta incluyen `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- [ ] HTTP 429 retornado con `Retry-After` header cuando se supera el límite
- [ ] Rate limit por `key_id`, no por IP (para evitar falsos positivos en NAT)

### 2.3 Endpoints de Alto Costo
- [ ] `start_adn_research`: máximo 5 requests/hora por organización (costo 2400 tokens)
- [ ] `generate_script`: máximo 50 requests/hora por key
- [ ] `search_creators`: máximo 200 requests/hora por key
- [ ] `publish_to_social`: máximo 20 requests/hora por key (previene spam)

---

## 3. Autenticación y Autorización

### 3.1 Validación en cada Request
- [ ] Header `Authorization: Bearer sk-kreoon-...` presente y bien formado
- [ ] Hash de la key comparado con `mcp_api_keys.key_hash` usando comparación en tiempo constante
- [ ] `is_revoked = false` verificado
- [ ] `expires_at > NOW()` verificado
- [ ] `organization_id` de la key coincide con el recurso solicitado (no cross-tenant)

### 3.2 Row-Level Security (RLS)
- [ ] Todas las tablas accedidas via MCP tienen RLS activado
- [ ] Ninguna consulta al MCP usa `service_role` key (que bypasea RLS)
- [ ] Las funciones del MCP usan `user` context, no `anon` ni `service_role`
- [ ] Policy de aislamiento por `organization_id` validada con `EXPLAIN (ANALYZE)` en staging

### 3.3 Validación de Organización
- [ ] `organization_id` en el JWT/key nunca puede ser sobreescrito por el body del request
- [ ] Endpoints de búsqueda no exponen datos de otras organizaciones aunque se manipule el query
- [ ] Logs de auditoría registran el `organization_id` real, no el del request

---

## 4. Protección de Datos Sensibles

### 4.1 Datos que NUNCA se exponen via MCP
- [ ] `mcp_api_keys.key_hash` — solo el prefix visible (primeros 8 chars del UUID)
- [ ] `wallet_accounts.stripe_account_id` — solo `has_stripe_connected: boolean`
- [ ] `profiles.email` — solo visible si scope `profile:admin` activo
- [ ] `organization_members.salary` — no presente en ningún endpoint MCP
- [ ] Tokens de integración social (Instagram, TikTok tokens) — nunca expuestos

### 4.2 Sanitización de Output
- [ ] PII (emails personales, teléfonos) filtrado en respuestas públicas de `search_creators`
- [ ] URLs de CDN con firma temporal (`bunny_signed_url`, TTL 1 hora) en lugar de permanentes
- [ ] Información financiera (balances, transacciones) solo accesible con scope `finance:read`
- [ ] Error messages no revelan información de schema o de otros tenants

### 4.3 Inputs
- [ ] Todas las cadenas de texto pasan por `sanitizeHtml()` antes de insertar en BD
- [ ] SQL injection imposible vía parámetros preparados (Supabase client siempre usa `?` binding)
- [ ] `product_id` y `organization_id` recibidos en el body validados contra UUID v4 regex
- [ ] Arrays de strings limitados a 50 elementos máximo (previene DoS en operaciones batch)

---

## 5. Audit Logging

### 5.1 Cobertura de Logs
- [ ] **100%** de los requests MCP registrados en `mcp_audit_logs`
- [ ] Logs incluyen: `key_id`, `action`, `resource_type`, `resource_id`, `ip_address`, `user_agent`, `response_status`, `response_time_ms`, `ai_tokens_used`
- [ ] Requests fallidos (401, 403, 429) también registrados
- [ ] Logs escritos de forma **asíncrona** para no aumentar latencia del endpoint

### 5.2 Retención y Acceso
- [ ] Logs retenidos mínimo 90 días en producción
- [ ] Logs de 90+ días comprimidos y movidos a almacenamiento frío
- [ ] Solo `admin` puede leer `mcp_audit_logs`
- [ ] Exportación de logs disponible para compliance (formato CSV/JSON)

### 5.3 Alertas
- [ ] Alerta automática si una key hace >1000 requests en 5 minutos (posible scraping)
- [ ] Alerta si se detectan requests desde IPs de TOR exit nodes
- [ ] Alerta si `response_status = 500` supera el 1% de requests en 15 minutos

---

## 6. Seguridad de Webhooks

### 6.1 Firma HMAC
- [ ] Cada webhook usa `secret_hash` único generado con `crypto.randomBytes(32).toString('hex')`
- [ ] Firma incluida en header `X-Kreoon-Signature: sha256=...`
- [ ] Firma calculada como `HMAC-SHA256(body, secret)` con el body **sin parsear** (raw bytes)
- [ ] Receptor debe verificar firma antes de procesar el evento

### 6.2 Configuración
- [ ] URLs de webhook solo aceptan HTTPS (rechazar `http://`)
- [ ] Timeout de entrega: 10 segundos máximo
- [ ] Retry policy: 3 reintentos con backoff exponencial (1s, 5s, 25s)
- [ ] Eventos fallidos después de 3 reintentos enviados a dead-letter queue

### 6.3 Validación del Receptor
- [ ] Certificado SSL/TLS del endpoint verificado (no `insecureSkipVerify`)
- [ ] IP del webhook no puede ser una dirección privada (previene SSRF: 10.x, 172.16.x, 192.168.x)
- [ ] Verificación del endpoint activo antes de guardar en `mcp_webhooks` (HTTP 200 requerido)

---

## 7. CORS y Transporte

### 7.1 CORS Headers
- [ ] `Access-Control-Allow-Origin` restringido (no `*`) en endpoints con datos sensibles
- [ ] `Access-Control-Allow-Methods: GET, POST` solamente (no PUT/DELETE desde browser)
- [ ] Preflight OPTIONS respondido correctamente con headers CORS
- [ ] Credenciales (`withCredentials`) no habilitadas en endpoints de API keys

### 7.2 HTTPS
- [ ] Todos los endpoints MCP solo disponibles en HTTPS
- [ ] HSTS header configurado: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] Certificados con renovación automática via Supabase/Vercel
- [ ] TLS 1.2 mínimo requerido (TLS 1.0 y 1.1 deshabilitados)

### 7.3 Headers de Seguridad
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Content-Security-Policy` configurado en respuestas con HTML
- [ ] `Referrer-Policy: no-referrer`

---

## 8. Gestión de Tokens IA

### 8.1 Validación Pre-Ejecución
- [ ] Verificar `ai_token_balances.available_tokens >= costo_operacion` antes de ejecutar
- [ ] Transacción atómica: verificar + reservar + ejecutar (no hay ventana de race condition)
- [ ] Si tokens insuficientes: HTTP 402 con mensaje `{"error": "INSUFFICIENT_AI_TOKENS", "required": 2400, "available": 1500}`
- [ ] Costo exacto descontado, no estimado (si operación falla, tokens reembolsados)

### 8.2 Límites de Gasto
- [ ] Alerta cuando organización llega al 80% de tokens del plan
- [ ] Hard stop al 100% (no crédito negativo en producción)
- [ ] Operaciones batch limitan tokens a 10% del balance disponible por request

---

## 9. Testing de Seguridad Pre-Deploy

### 9.1 Tests Obligatorios
- [ ] **Cross-tenant test**: key de org A no puede leer datos de org B
- [ ] **Scope test**: key sin scope `finance:read` recibe 403 en `/wallet/overview`
- [ ] **Expired key test**: key expirada recibe 401
- [ ] **Revoked key test**: key con `is_revoked=true` recibe 401 inmediatamente
- [ ] **Rate limit test**: 101 requests en 1 hora desde key Free recibe 429 en el 101
- [ ] **SQL injection test**: `'; DROP TABLE users; --` en parámetros de búsqueda
- [ ] **Path traversal test**: `../../../etc/passwd` en resource_id parameters
- [ ] **Large payload test**: body de 10MB recibe 413 antes de procesarse

### 9.2 Revisión de Código
- [ ] Ninguna variable de entorno hardcodeada en Edge Functions
- [ ] `console.log` no expone datos sensibles en logs de producción
- [ ] Dependencias del proyecto sin CVEs conocidos (`npm audit` limpio)

---

## 10. Checklist de Compliance

### 10.1 Privacidad (GDPR/LGPD)
- [ ] Datos de creadores colombianos/latinoamericanos bajo jurisdicción colombiana
- [ ] Derecho al olvido: `DELETE FROM profiles WHERE id = ?` cascadea correctamente
- [ ] Logs de auditoría anonimizables (reemplazar `user_id` por hash irreversible)
- [ ] Consentimiento explícito para uso de datos en matching de IA documentado

### 10.2 Términos de Servicio de Plataformas
- [ ] Publicación en Instagram via API respeta límites de Instagram Graph API (200 posts/día)
- [ ] TikTok: verificar términos de uso de Content Posting API antes de habilitar
- [ ] No almacenar tokens de OAuth de usuarios por más de lo permitido en cada ToS
- [ ] Uso de datos de Instagram para analytics cumple Platform Policy

---

## Aprobación Final

| Ítem | Responsable | Estado |
|------|-------------|--------|
| RLS policies revisadas | Backend Dev | ⬜ Pendiente |
| Rate limits testeados en staging | QA | ⬜ Pendiente |
| CORS configurado | Backend Dev | ⬜ Pendiente |
| Audit logs funcionando | Backend Dev | ⬜ Pendiente |
| Webhook HMAC testeado | Backend Dev | ⬜ Pendiente |
| Cross-tenant test pasado | QA | ⬜ Pendiente |
| Security review completado | Líder Técnico | ⬜ Pendiente |

**Deploy autorizado cuando todos los ítems estén ✅**
