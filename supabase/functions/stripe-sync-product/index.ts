// ============================================================
// STRIPE SYNC PRODUCT (hardened)
// Crea/actualiza Product+Price en la cuenta de Stripe central de
// KREOON para una academia (subscription mensual) o un curso (one-time).
//
// Seguridad:
//   - verify_jwt=false porque se invoca desde un trigger DB (pg_net).
//   - Cada request DEBE incluir header X-Sync-Secret cuyo valor coincida
//     con STRIPE_SYNC_SECRET (también guardado en vault como `stripe_sync_secret`
//     y leído por el trigger). Comparación constant-time.
//   - Los RPCs `get_stripe_sync_payload` y `apply_stripe_sync_result` también
//     reciben el secret y validan el patrón de los IDs de Stripe + previenen
//     re-asignación del product_id (anti-hijack).
// ============================================================

import Stripe from 'https://esm.sh/stripe@14.14.0';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const STRIPE_SYNC_SECRET = Deno.env.get('STRIPE_SYNC_SECRET') ?? '';

type EntityType = 'academy_space' | 'academy_course';

/** Comparación constant-time de strings (resistente a timing attacks). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function callRpc<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`rpc ${name} ${res.status}: ${text.slice(0, 200)}`);
  }
  return text ? (JSON.parse(text) as T) : (null as unknown as T);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  // 1. Auth: shared secret obligatorio.
  const providedSecret = req.headers.get('X-Sync-Secret') ?? '';
  if (!STRIPE_SYNC_SECRET || !providedSecret || !timingSafeEqual(providedSecret, STRIPE_SYNC_SECRET)) {
    return corsJsonResponse(req, { error: 'unauthorized' }, 401);
  }

  if (!Deno.env.get('STRIPE_SECRET_KEY')) {
    return corsJsonResponse(req, { error: 'stripe_not_configured' }, 500);
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return corsJsonResponse(req, { error: 'supabase_env_missing' }, 500);
  }

  try {
    const { entity_type, entity_id } = (await req.json()) as {
      entity_type: EntityType;
      entity_id: string;
    };
    if (!entity_type || !entity_id) {
      return corsJsonResponse(req, { error: 'entity_type_and_id_required' }, 400);
    }

    const payload = await callRpc<Record<string, any> | null>(
      'get_stripe_sync_payload',
      {
        p_caller_secret: STRIPE_SYNC_SECRET,
        p_entity_type: entity_type,
        p_entity_id: entity_id,
      },
    );

    if (!payload) {
      return corsJsonResponse(req, { error: 'entity_not_found' }, 404);
    }

    if (entity_type === 'academy_space') {
      return await syncAcademySpace(payload, req);
    }
    if (entity_type === 'academy_course') {
      return await syncAcademyCourse(payload, req);
    }
    return corsJsonResponse(req, { error: 'unknown_entity_type' }, 400);
  } catch (err: any) {
    console.error('stripe-sync-product error', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'internal_error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});

async function persistResult(
  entityType: EntityType,
  entityId: string,
  productId: string | null,
  priceId: string | null,
  yearlyPriceId: string | null = null,
): Promise<void> {
  await callRpc('apply_stripe_sync_result_v2', {
    p_caller_secret: STRIPE_SYNC_SECRET,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_stripe_product_id: productId,
    p_stripe_price_id: priceId,
    p_stripe_yearly_price_id: yearlyPriceId,
  });
}

/** Crea o reutiliza un Price recurrente para el product dado. */
async function ensureRecurringPrice(
  productId: string,
  existingPriceId: string | null,
  unitAmount: number,
  interval: 'month' | 'year',
  entityId: string,
): Promise<string> {
  let recreate = !existingPriceId;
  if (existingPriceId) {
    try {
      const current = await stripe.prices.retrieve(existingPriceId);
      if (
        current.unit_amount !== unitAmount ||
        current.currency !== 'usd' ||
        current.recurring?.interval !== interval ||
        !current.active
      ) {
        recreate = true;
      }
    } catch {
      recreate = true;
    }
  }

  if (!recreate && existingPriceId) return existingPriceId;

  const newPrice = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'usd',
    recurring: { interval },
    metadata: {
      kreoon_entity: 'academy_space',
      kreoon_entity_id: entityId,
      kreoon_plan: interval === 'month' ? 'monthly' : 'yearly',
    },
  });
  if (existingPriceId && existingPriceId !== newPrice.id) {
    try {
      await stripe.prices.update(existingPriceId, { active: false });
    } catch (e) {
      console.warn('Could not deactivate old price', existingPriceId, e);
    }
  }
  return newPrice.id;
}

// ─── ACADEMY SPACE (mensual + anual opcional) ──────────────────────────

async function syncAcademySpace(space: any, req: Request) {
  const monthlyPrice = Number(space.membership_price_usd ?? 0);
  const yearlyPrice = Number(space.yearly_price_usd ?? 0);

  if (monthlyPrice <= 0 && yearlyPrice <= 0) {
    // Sin ningún plan de pago: archivar product.
    if (space.stripe_product_id) {
      try {
        await stripe.products.update(space.stripe_product_id, { active: false });
      } catch (e) {
        console.warn('Could not deactivate product', space.stripe_product_id, e);
      }
    }
    await persistResult('academy_space', space.id, space.stripe_product_id ?? null, null, null);
    return corsJsonResponse(req, { ok: true, archived: true });
  }

  let productId = space.stripe_product_id as string | null;
  const description = stripText(space.description) || `Suscripción a la academia "${space.name}" en KREOON`;
  const images = space.cover_image_url ? [space.cover_image_url] : space.logo_url ? [space.logo_url] : undefined;

  if (!productId) {
    const product = await stripe.products.create({
      name: space.name,
      description,
      images,
      metadata: {
        kreoon_entity: 'academy_space',
        kreoon_entity_id: space.id,
        kreoon_slug: space.slug,
      },
    });
    productId = product.id;
  } else {
    try {
      await stripe.products.update(productId, {
        name: space.name,
        description,
        active: true,
        metadata: {
          kreoon_entity: 'academy_space',
          kreoon_entity_id: space.id,
          kreoon_slug: space.slug,
        },
      });
    } catch (e) {
      console.warn('Recreating product (could not update)', e);
      const product = await stripe.products.create({
        name: space.name,
        description,
        metadata: { kreoon_entity: 'academy_space', kreoon_entity_id: space.id },
      });
      productId = product.id;
    }
  }

  // Price mensual.
  let priceId: string | null = null;
  if (monthlyPrice > 0) {
    priceId = await ensureRecurringPrice(
      productId!,
      space.stripe_price_id ?? null,
      Math.round(monthlyPrice * 100),
      'month',
      space.id,
    );
  } else if (space.stripe_price_id) {
    try {
      await stripe.prices.update(space.stripe_price_id, { active: false });
    } catch (e) {
      console.warn('Could not deactivate monthly price', e);
    }
  }

  // Price anual.
  let yearlyPriceId: string | null = null;
  if (yearlyPrice > 0) {
    yearlyPriceId = await ensureRecurringPrice(
      productId!,
      space.stripe_yearly_price_id ?? null,
      Math.round(yearlyPrice * 100),
      'year',
      space.id,
    );
  } else if (space.stripe_yearly_price_id) {
    try {
      await stripe.prices.update(space.stripe_yearly_price_id, { active: false });
    } catch (e) {
      console.warn('Could not deactivate yearly price', e);
    }
  }

  await persistResult('academy_space', space.id, productId, priceId, yearlyPriceId);

  return corsJsonResponse(req, {
    ok: true,
    entity_type: 'academy_space',
    stripe_product_id: productId,
    stripe_price_id: priceId,
    stripe_yearly_price_id: yearlyPriceId,
  });
}

// ─── ACADEMY COURSE (pago único) ───────────────────────────────────────

async function syncAcademyCourse(course: any, req: Request) {
  const price = Number(course.price_usd ?? 0);
  const sellable = !course.is_free && price > 0;

  if (!sellable) {
    if (course.stripe_product_id) {
      try {
        await stripe.products.update(course.stripe_product_id, { active: false });
      } catch (e) {
        console.warn('Could not deactivate course product', e);
      }
    }
    await persistResult('academy_course', course.id, course.stripe_product_id ?? null, null);
    return corsJsonResponse(req, { ok: true, archived: true });
  }

  let productId = course.stripe_product_id as string | null;
  const baseName = `Curso · ${course.title}`;
  const baseDesc = stripText(course.description) || `Acceso al curso "${course.title}" en KREOON Academia`;

  if (!productId) {
    const product = await stripe.products.create({
      name: baseName,
      description: baseDesc,
      images: course.cover_image_url ? [course.cover_image_url] : undefined,
      metadata: {
        kreoon_entity: 'academy_course',
        kreoon_entity_id: course.id,
        kreoon_space_id: course.space_id,
        kreoon_slug: course.slug,
      },
    });
    productId = product.id;
  } else {
    try {
      await stripe.products.update(productId, {
        name: baseName,
        description: baseDesc,
        active: true,
        metadata: {
          kreoon_entity: 'academy_course',
          kreoon_entity_id: course.id,
          kreoon_space_id: course.space_id,
        },
      });
    } catch (e) {
      console.warn('Recreating course product', e);
      const product = await stripe.products.create({
        name: baseName,
        description: baseDesc,
        metadata: { kreoon_entity: 'academy_course', kreoon_entity_id: course.id },
      });
      productId = product.id;
    }
  }

  const desiredUnitAmount = Math.round(price * 100);
  let priceId = course.stripe_price_id as string | null;
  let recreatePrice = !priceId;
  if (priceId) {
    try {
      const current = await stripe.prices.retrieve(priceId);
      if (
        current.unit_amount !== desiredUnitAmount ||
        current.currency !== 'usd' ||
        current.recurring ||
        !current.active
      ) {
        recreatePrice = true;
      }
    } catch {
      recreatePrice = true;
    }
  }

  if (recreatePrice) {
    const newPrice = await stripe.prices.create({
      product: productId!,
      unit_amount: desiredUnitAmount,
      currency: 'usd',
      metadata: {
        kreoon_entity: 'academy_course',
        kreoon_entity_id: course.id,
      },
    });
    if (priceId && priceId !== newPrice.id) {
      try {
        await stripe.prices.update(priceId, { active: false });
      } catch (e) {
        console.warn('Could not deactivate old course price', priceId, e);
      }
    }
    priceId = newPrice.id;
  }

  await persistResult('academy_course', course.id, productId, priceId);

  return corsJsonResponse(req, {
    ok: true,
    entity_type: 'academy_course',
    stripe_product_id: productId,
    stripe_price_id: priceId,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────

function stripText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}
