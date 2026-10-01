/**
 * Guard para herramientas de UN SOLO USO / administrativas heredadas (migración desde la base
 * anterior, bootstrap del root, reseteo masivo de contraseñas, sincronización de permisos).
 *
 * Estas funciones hacen escrituras masivas con service_role (upsert de organizaciones, perfiles,
 * membresías; creación/cambio de contraseñas) y varias estuvieron desplegadas con verify_jwt=false.
 * Tras el relanzamiento NO deben ser alcanzables por defecto: solo responden si el entorno activa
 * explícitamente ENABLE_LEGACY_ADMIN_TOOLS=true (p. ej. durante una migración supervisada).
 * Recomendación operativa: eliminarlas del proyecto (`supabase functions delete <nombre>`).
 */
export function legacyToolGuard(): Response | null {
  if (Deno.env.get("ENABLE_LEGACY_ADMIN_TOOLS") === "true") return null;
  return new Response(
    JSON.stringify({
      error: "tool_disabled",
      message: "Esta herramienta administrativa heredada está deshabilitada. Contacta al propietario de la plataforma.",
    }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  );
}
