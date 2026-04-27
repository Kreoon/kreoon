// ============================================================================
// KREOON Validation - Zod-based runtime validation for Edge Functions
// ============================================================================

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

// Re-export Zod for use in other functions
export { z };

// ─── Common Schemas ─────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email();

export const organizationIdSchema = z.string().uuid({
  message: "organization_id debe ser un UUID válido",
});

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ─── AI Request Schemas ─────────────────────────────────────────────────────

export const aiRequestSchema = z.object({
  prompt: z.string().min(1, "El prompt no puede estar vacío").max(50000),
  context: z.string().optional(),
  max_tokens: z.number().int().positive().max(8000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  organization_id: organizationIdSchema,
  user_id: uuidSchema.optional(),
});

export type AiRequest = z.infer<typeof aiRequestSchema>;

// ─── Content Schemas ────────────────────────────────────────────────────────

export const contentCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  type: z.enum(["post", "story", "reel", "video", "article", "podcast"]),
  platform: z.enum(["instagram", "tiktok", "youtube", "twitter", "linkedin", "facebook"]).optional(),
  organization_id: organizationIdSchema,
  creator_id: uuidSchema.optional(),
  scheduled_at: z.string().datetime().optional(),
});

export type ContentCreate = z.infer<typeof contentCreateSchema>;

// ─── User Schemas ───────────────────────────────────────────────────────────

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const invitationRequestSchema = z.object({
  email: emailSchema,
  organization_id: organizationIdSchema,
  role: z.enum(["admin", "team_leader", "strategist", "trafficker", "creator", "editor", "client"]),
  invited_by: uuidSchema,
});

export type InvitationRequest = z.infer<typeof invitationRequestSchema>;

// ─── Tokens Schemas ─────────────────────────────────────────────────────────

export const addTokensSchema = z.object({
  organization_id: organizationIdSchema,
  amount: z.number().int().positive({ message: "La cantidad de tokens debe ser positiva" }),
  reason: z.string().min(1).max(500).optional(),
  admin_id: uuidSchema.optional(),
});

export type AddTokensRequest = z.infer<typeof addTokensSchema>;

// ─── Webhook Schemas ────────────────────────────────────────────────────────

export const bunnyWebhookSchema = z.object({
  VideoGuid: z.string().uuid().optional(),
  Status: z.number().int().optional(),
  VideoLibraryId: z.number().int().optional(),
  Message: z.string().optional(),
});

export type BunnyWebhookPayload = z.infer<typeof bunnyWebhookSchema>;

// ─── Validation Helper ──────────────────────────────────────────────────────

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
}

/**
 * Validates input against a Zod schema and returns a typed result
 */
export function validate<T>(schema: z.ZodSchema<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Formats Zod errors into a human-readable string
 */
export function formatValidationErrors(errors: z.ZodError): string {
  return errors.errors
    .map((err) => `${err.path.join(".")}: ${err.message}`)
    .join("; ");
}

/**
 * Creates a validation error response for Edge Functions
 */
export function validationErrorResponse(errors: z.ZodError): Response {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  return new Response(
    JSON.stringify({
      error: "Validation Error",
      code: "ERR_400",
      details: errors.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      })),
    }),
    { status: 400, headers: corsHeaders }
  );
}
