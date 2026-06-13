# QA Report - Academia v1 + v2
Generado por Codex el 2026-06-04 sobre rama Dev_Branch_Alexander

## Resumen ejecutivo

| Severidad | Cantidad |
|-----------|---------|
| Criticos  | 4       |
| Altos     | 7       |
| Medios    | 8       |
| Bajos     | 6       |
| **Total** | **25**  |

**Recomendacion: fix-first** - El modulo tiene una arquitectura solida y alcance funcional amplio, pero cuatro hallazgos de seguridad deben resolverse antes de activarlo en produccion: RLS abierta en lecciones/modulos, RPCs de certificados sin verificacion de caller, award_space_points invocable por cualquier usuario autenticado, y escrituras de comunidad sin validar membresia activa.

---

## CRITICOS (bloquean ship)

### [C-01] RLS de lecciones, modulos y requisitos de certificado queda completamente abierta

- **Archivos:** supabase/migrations/20260606120000_fix_academia_rls_circular.sql:8-19 y supabase/migrations/20260606095803_kreoon_academia_module.sql:144-157
- **Descripcion:** La migracion de fix anti-circular reemplazo las politicas de modules, lessons y certificate_requirements por USING (true). Cualquier usuario autenticado puede leer el contenido completo de cursos (video_url, video_bunny_id, content) independientemente de organizacion o matricula.
- **Impacto:** Filtracion masiva de videos de pago. Un atacante autenticado extrae todos los Bunny CDN video IDs con una sola query.
- **Reproduccion:** SELECT * FROM academy_modules desde cualquier sesion autenticada devuelve filas de todas las organizaciones.
- **Sugerencia de fix:** Crear SECURITY DEFINER is_academy_member(org_id uuid) que consulte organization_members directamente y usarla en el USING de modulos/lecciones.

---

### [C-02] RPCs de certificados aceptan p_user_id arbitrario sin verificar caller

- **Archivos:** supabase/migrations/20260606095803_kreoon_academia_module.sql:425-568 (check_certificate_eligibility, issue_academy_certificate)
- **Descripcion:** Ambas funciones SECURITY DEFINER aceptan p_user_id uuid sin verificar que auth.uid() = p_user_id. check_certificate_eligibility expone el progreso de cualquier usuario; issue_academy_certificate puede emitir certificados para otro usuario.
- **Impacto:** Un usuario puede emitir certificados fraudulentos para otros o consultar el progreso privado de companeros.
- **Sugerencia de fix:** IF p_user_id <> auth.uid() THEN RAISE EXCEPTION forbidden; END IF; al inicio de ambas funciones. Para flujos de admin, variante con EXECUTE restringido a service_role.

---

### [C-03] award_space_points es invocable por cualquier usuario autenticado con puntos arbitrarios

- **Archivos:** supabase/migrations/20260606104203_academia_community_features.sql:286-329
- **Descripcion:** La RPC award_space_points(p_user_id, p_space_id, p_points, p_action) tiene GRANT EXECUTE ... TO authenticated. No valida quien llama, ni la accion, ni el rango de puntos.
- **Impacto:** Gamificacion completamente bypasseable. El leaderboard pierde integridad.
- **Sugerencia de fix:** Revocar EXECUTE a authenticated. Solo triggers internos y service_role deben poder llamarla. Usar allowlist de acciones con puntos fijos.

---

### [C-04] Politicas de escritura en comunidad no validan membresia activa al espacio

- **Archivos:** supabase/migrations/20260606104203_academia_community_features.sql:435-579 (posts, comments, reactions, poll votes, RSVPs)
- **Descripcion:** Las politicas WITH CHECK de insert solo verifican user_id = auth.uid(), sin comprobar membresia activa. Un usuario puede postear en cualquier space conociendo su UUID.
- **Impacto:** Spam en espacios privados; corrupcion de metricas; bypass de acceso a eventos.
- **Sugerencia de fix:** Agregar a cada WITH CHECK: EXISTS (SELECT 1 FROM academy_space_members WHERE space_id = NEW.space_id AND user_id = auth.uid() AND status = active).

---

## ALTOS

### [A-01] Reacciones inflan puntos mediante delete/re-insert ciclico
- **Archivos:** supabase/migrations/20260606104203_academia_community_features.sql:367-389 y src/hooks/academy/useAcademyCommunity.ts:121-141
- **Descripcion:** El trigger trg_reaction_gamification llama award_space_points con +2 en INSERT y -2 en DELETE. El hook de toggle borra y re-inserta. Con C-03 sin parchear, escala a inflacion masiva de puntos.
- **Sugerencia de fix:** Verificar en el trigger que la reaccion NO existia antes de otorgar puntos, o usar ON CONFLICT DO UPDATE.

### [A-02] my_reaction puede llegar como array JSONB vacio y PostCard lo evalua como truthy
- **Archivos:** src/hooks/academy/useAcademyCommunity.ts:43-48 y src/components/academy/community/PostCard.tsx:217-221
- **Descripcion:** json_agg puede devolver []. PostCard lo evalua como truthy y muestra reaccion activa inexistente.
- **Sugerencia de fix:** const reaction = Array.isArray(my_reaction) ? my_reaction[0] ?? null : my_reaction ?? null;

### [A-03] Polls no cargan my_poll_vote y el conteo no se actualiza optimistamente
- **Archivos:** src/hooks/academy/useAcademyCommunity.ts:25-31, :253-267 y src/components/academy/community/PostCard.tsx:237-281
- **Descripcion:** La query del feed no incluye academy_poll_votes del usuario actual, hasVoted siempre es false en el primer render. La mutacion no hace optimistic update.
- **Sugerencia de fix:** Incluir LEFT JOIN con academy_poll_votes filtrado por auth.uid(); agregar onMutate con rollback en useVotePoll.

### [A-04] Submit de quiz no es atomico - respuestas pueden quedar huerfanas
- **Archivos:** src/hooks/academy/useAcademyQuiz.ts:93-110 y src/components/academy/QuizEngine.tsx:145-158
- **Descripcion:** useSubmitQuizAttempt inserta respuestas y luego invoca la edge function. Si la edge function falla, el intento queda in_progress con respuestas ya insertadas. El siguiente intento puede insertar duplicados.
- **Sugerencia de fix:** Mover la insercion de respuestas a la edge function dentro de una transaccion Postgres.

### [A-05] Upload de archivos no valida MIME en cliente antes del envio a Storage
- **Archivos:** src/components/academy/QuizEngine.tsx:615-623 y src/components/academy/community/PostComposer.tsx:48-55
- **Descripcion:** La validacion usa extension del nombre, no file.type (MIME real). Un atacante puede subir un archivo HTML renombrado como .jpg.
- **Nota:** Requiere verificacion runtime - posiblemente mitigado por configuracion del bucket.
- **Sugerencia de fix:** Verificar file.type contra allowlist: image/jpeg, image/png, image/gif, video/mp4, video/quicktime, application/pdf.

### [A-06] Espacios publicos bloquean la lectura de posts a no-miembros
- **Archivos:** supabase/migrations/20260606104203_academia_community_features.sql:428-455
- **Descripcion:** La politica SELECT en academy_posts exige membresia activa incluso para spaces con is_public = true. Contradice el UX de preview.
- **Sugerencia de fix:** USING (EXISTS(SELECT 1 FROM academy_spaces WHERE is_public = true AND id = space_id) OR EXISTS (membership check))

### [A-07] Quiz sin preguntas auto-calificables produce NaN/score 0% incorrecto
- **Archivos:** supabase/functions/academy-grade-attempt/index.ts:87-90, :160-176
- **Descripcion:** Si autoQuestions.length es 0, auto_total_points es 0 y la division produce NaN (JS). El fallback a 0 cierra el intento como failed aunque el quiz sea 100% manual.
- **Sugerencia de fix:** const autoScore = autoQuestions.length > 0 ? (auto_score / auto_total_points * 100) : null; y manejar pending_review para quizzes manuales.

---

## MEDIOS

### [M-01] sanitizeHTML no bloquea data: URIs ni atributos style con expresiones CSS
- **Archivos:** src/lib/sanitizeHTML.ts:11-34
- **Descripcion:** La funcion usa DOMPurify pero no configura FORBID_ATTR con style ni FORCE_BODY. Un payload con style=background:url(javascript:...) puede pasar si DOMPurify no esta actualizado.
- **Sugerencia de fix:** Agregar { FORBID_ATTR: [style, onerror, onload], FORBID_TAGS: [object, embed, iframe], ALLOW_DATA_ATTR: false } a la config de DOMPurify.

### [M-02] KiroAssistDialog parsea JSON con regex greedy sin schema validation
- **Archivos:** src/components/academy/community/KiroAssistDialog.tsx:56-70
- **Descripcion:** Extrae JSON con regex sobre la respuesta del LLM sin validacion de schema (Zod) tras el parse. Un prompt injection puede hacer que el modelo devuelva campos extra que se rendericen en la UI.
- **Sugerencia de fix:** Usar z.object({...}).safeParse(parsed) para validar la estructura esperada.

### [M-03] Race condition en recalculo de progreso de matricula
- **Archivos:** src/hooks/academy/useAcademyCourse.ts:244-306
- **Descripcion:** recalcEnrollmentCompletion se invoca desde el onSuccess de completeLesson. 3 lecciones rapidas = 3 llamadas concurrentes; la ultima sobrescribe el progreso de las demas.
- **Sugerencia de fix:** Debounce de 500ms o usar contador optimista en cliente.

### [M-04] academy_plans no tiene politica RLS explicita en la migracion
- **Archivos:** supabase/migrations/20260606095803_kreoon_academia_module.sql:9-23, :825
- **Descripcion:** La tabla tiene ENABLE ROW LEVEL SECURITY pero no se define ninguna politica. En Postgres, RLS habilitada sin politicas bloquea todo acceso incluyendo SELECT.
- **Sugerencia de fix:** Agregar CREATE POLICY plans_read ON academy_plans FOR SELECT USING (true).

### [M-05] Falta manejo de error visible en submit, upload y create
- **Archivos:** src/pages/academia/AcademiaCreatePage.tsx:156, src/components/academy/QuizEngine.tsx:155-158, :627, src/components/academy/community/PostComposer.tsx:57-59
- **Descripcion:** Los bloques catch hacen console.error pero no muestran toast ni mensaje de error al usuario.
- **Sugerencia de fix:** Agregar toast.error(...) en cada catch relevante.

### [M-06] Analytics de comunidad contiene datos hardcodeados/mock
- **Archivos:** src/hooks/academy/useSpaceAnalytics.ts:49, :71, :98, :107
- **Descripcion:** Metricas como retencion, NPS y engagement score son valores hardcodeados. Activarlos en produccion lleva a decisiones basadas en datos falsos.
- **Sugerencia de fix:** Deshabilitar tab Analytics hasta implementar.

### [M-07] useAcademyEnrollment no maneja el caso de matricula duplicada
- **Archivos:** src/hooks/academy/useAcademyEnrollment.ts:45-68
- **Descripcion:** INSERT sin ON CONFLICT DO NOTHING. Doble clic o reintento de red produce error de constraint no manejado con mensaje amigable.
- **Sugerencia de fix:** Usar .upsert(..., { onConflict: user_id, course_id }) o capturar error 23505.

### [M-08] useSpaceFeed devuelve datos obsoletos por staleTime de 60s en feeds activos
- **Archivos:** src/hooks/academy/useSpaceFeed.ts
- **Descripcion:** Con comunidades activas, 60s de stale hacen que el usuario vea posts eliminados o no vea posts nuevos durante un minuto.
- **Sugerencia de fix:** Reducir a staleTime: 10000 o implementar Supabase Realtime channel.

---

## BAJOS

### [B-01] Botones icon-only sin aria-label
- **Archivos:** src/components/academy/AcademyVideoPlayer.tsx:230-257, src/components/academy/community/PostCard.tsx:110-197, src/components/academy/community/KiroAssistDialog.tsx:94-96
- **Descripcion:** Multiples botones de accion no tienen aria-label. Lectores de pantalla los anuncian como button sin contexto.
- **Sugerencia de fix:** Agregar aria-label descriptivo a cada boton icon-only.

### [B-02] Modales sin Escape key trap ni role ARIA correcto
- **Archivos:** src/components/academy/community/KiroAssistDialog.tsx:79-83, src/components/academy/QuizEngine.tsx:317-323
- **Descripcion:** Los overlays no capturan Escape para cerrar ni tienen role=dialog con aria-modal=true. El foco no se atrapa.
- **Sugerencia de fix:** Usar el componente Dialog de shadcn/ui.

### [B-03] Contraste insuficiente - text-zinc-500 sobre bg-white/5
- **Archivos:** Multiples componentes del modulo Academia
- **Descripcion:** text-zinc-500 (#71717a) sobre fondo #0a0a0f tiene ratio aprox. 3.2:1, por debajo del minimo WCAG AA de 4.5:1 para texto normal.
- **Sugerencia de fix:** Usar text-zinc-400 o superior para texto secundario en modo oscuro.

### [B-04] SpaceNavbar con 7-8 tabs no es responsive en movil
- **Archivos:** src/components/academy/community/SpaceNavbar.tsx
- **Descripcion:** En pantallas menores a 375px los tabs se cortan sin menu alternativo.
- **Sugerencia de fix:** Implementar overflow-x-auto o dropdown en movil.

### [B-05] Dark mode hardcodeado - componentes se rompen en tema claro
- **Archivos:** Multiples componentes con bg-[#0a0a0f], bg-zinc-950, text-white hardcodeados
- **Descripcion:** El modulo asume modo oscuro permanente. Tema claro hace el texto blanco sobre fondo blanco ilegible.
- **Sugerencia de fix:** Usar variables CSS del design system: bg-background, text-foreground, border-border.

### [B-06] Iconografia mezcla lucide-react con heroicons en 2 componentes
- **Archivos:** src/components/academy/community/SpaceMap.tsx:12, src/pages/academia/AcademiaExplorePage.tsx:8
- **Descripcion:** El proyecto usa exclusivamente lucide-react (CLAUDE.md), pero estos archivos importan de @heroicons/react.
- **Sugerencia de fix:** Reemplazar con equivalentes de lucide-react: MapPin, Search, etc.

---

## UX/UI hallazgos

| # | Componente | Hallazgo |
|---|-----------|---------|
| U-01 | AcademiaHomePage | No tiene empty state cuando no hay cursos matriculados - lista vacia sin CTA |
| U-02 | SpaceFeed | Skeleton loader solo en primer load; refetches muestran datos antiguos sin indicador |
| U-03 | QuizEngine | Boton Submit no se desactiva si el servidor tarda mas de 10s - doble submit posible |
| U-04 | LeaderboardPage | Posicion propia no se resalta si el usuario esta fuera del top 10 |
| U-05 | CertificateView | El PDF de certificado no tiene fallback si la generacion falla |
| U-06 | AcademiaPlayerPage | Progreso de leccion se marca completo al iniciar video, no al terminarlo |
| U-07 | EventDetailPage | Sin confirmacion visual persistente tras hacer RSVP (solo toast efimero) |
| U-08 | AdminDashboard | Tabs Monetizacion, Integraciones y Avanzado muestran pantalla en blanco |

---

## Deuda tecnica documentada

| # | Feature | Estado | Ubicacion |
|---|---------|--------|-----------|
| TD-01 | Stripe checkout para planes | Stub no implementado | src/hooks/academy/useAcademyEnrollment.ts:85-91 |
| TD-02 | Auto-DM al unirse a espacio | Guarda config pero no envia | src/components/academy/community/SpacePluginsPanel.tsx:87-99 |
| TD-03 | Integracion Zapier/Meta/Google/Hyros | Formularios sin logica de save real | SpacePluginsPanel.tsx:140-226 |
| TD-04 | Mapa interactivo de espacios | Mock con pins estaticos | src/components/academy/community/SpaceMap.tsx:45-118 |
| TD-05 | Analytics Fase 8 (retencion, NPS, cohorts) | Valores hardcodeados | src/hooks/academy/useSpaceAnalytics.ts:49-107 |
| TD-06 | Admin tabs Monetizacion/Integraciones/Avanzado | Pantalla en blanco | src/pages/academia/AcademiaSpaceAdminPage.tsx:179-199 |
| TD-07 | Menciones en posts (@usuario) | UI preparada, notificaciones ausentes | src/components/academy/community/PostComposer.tsx |
| TD-08 | Moderacion de contenido (reportes) | Boton presente, backend no existe | src/components/academy/community/PostCard.tsx |
| TD-09 | Exportacion de certificados como PDF | CertificateView llama funcion que retorna vacio | src/pages/academia/AcademiasCertificatePage.tsx |
| TD-10 | Live sessions / Webinars | Placeholder en EventDetailPage | src/pages/academia/AcademiaEventDetailPage.tsx |

---

## Lo que si esta bien (no todo es malo)

- **IDOR en edge function bloqueado correctamente:** academy-grade-attempt/index.ts:21-30, 64-72 valida JWT con supabase.auth.getUser(jwt) y verifica attempt.user_id === callerId. El IDOR directo sobre attempts esta bloqueado.
- **search_path fijo en funciones SECURITY DEFINER:** Las RPCs principales incluyen SET search_path = public, pg_catalog para prevenir schema injection.
- **Paths de upload usan UUID:** QuizEngine.tsx y PostComposer.tsx generan crypto.randomUUID() como nombre de archivo. Sin path traversal residual.
- **Code splitting correcto:** App.tsx:250-265 lazy-loada todo el modulo Academia con React.lazy(), evitando impacto en el bundle principal.
- **Query keys con scope bien definido:** Los hooks usan [academy, entity, id, organizationId] como keys para invalidacion selectiva correcta.
- **enabled guards en hooks:** La mayoria de hooks tienen enabled: !!courseId && !!organizationId para prevenir queries con argumentos vacios.
- **Tipado TypeScript completo:** src/types/academy.ts y src/types/academy-community.ts cubren todas las entidades con tipos estrictos.
- **Migracion de fix circular consciente:** El commit 20260606120000 muestra consciencia del problema - buen instinto, ejecucion incompleta (ver C-01).
- **Estructura de componentes modular y limpia:** La separacion en academy/ y academy/community/ con barrel exports es consistente con el resto del proyecto.
- **Sidebar con permisos correctos:** Sidebar.tsx renderiza la entrada Academia condicionada a roles relevantes (no visible al rol client).

---

*Reporte generado en base a analisis estatico de los commits ab761278 y 73b32019 sobre rama Dev_Branch_Alexander. Los hallazgos marcados como requiere runtime test deben verificarse en entorno de staging antes de cerrarlos.*