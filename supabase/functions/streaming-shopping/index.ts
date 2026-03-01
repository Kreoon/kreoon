/**
 * streaming-shopping - Lógica de Live Shopping
 * Gestión de productos, flash offers, compras y escrow
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Commission rates from unified financial system
const COMMISSION_RATES = {
  live_shopping: 0.20, // 20% platform commission
  flash_offer_bonus: 0.05, // Extra 5% for flash offer sales
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT for most actions
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (!authError && user) {
        userId = user.id;
      }
    }

    const { action, ...params } = await req.json();
    console.log(`[streaming-shopping] Action: ${action}, User: ${userId}`);

    switch (action) {
      // ============================================
      // PRODUCT MANAGEMENT
      // ============================================
      case 'add_product_to_session': {
        const {
          session_id,
          product_id,
          live_price_usd,
          stock_for_live,
          sort_order,
        } = params;

        if (!session_id || !product_id) {
          return jsonResponse({ error: 'Missing session_id or product_id' }, 400);
        }

        // Get product details
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('name, base_price_usd, image_url')
          .eq('id', product_id)
          .single();

        if (productError || !product) {
          return jsonResponse({ error: 'Product not found' }, 404);
        }

        // Create streaming product
        const { data: streamingProduct, error: insertError } = await supabase
          .from('streaming_products_v2')
          .insert({
            session_id,
            product_id,
            name: product.name,
            live_price_usd: live_price_usd || product.base_price_usd,
            original_price_usd: product.base_price_usd,
            stock_for_live: stock_for_live || 0, // 0 = unlimited
            image_url: product.image_url,
            sort_order: sort_order || 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return jsonResponse({ product: streamingProduct });
      }

      case 'update_product': {
        const { streaming_product_id, updates } = params;

        if (!streaming_product_id) {
          return jsonResponse({ error: 'Missing streaming_product_id' }, 400);
        }

        const { error } = await supabase
          .from('streaming_products_v2')
          .update(updates)
          .eq('id', streaming_product_id);

        if (error) throw error;

        return jsonResponse({ success: true });
      }

      case 'remove_product': {
        const { streaming_product_id } = params;

        const { error } = await supabase
          .from('streaming_products_v2')
          .delete()
          .eq('id', streaming_product_id);

        if (error) throw error;

        return jsonResponse({ success: true });
      }

      // ============================================
      // FEATURING (destacar producto en vivo)
      // ============================================
      case 'feature_product': {
        const { session_id, streaming_product_id } = params;

        if (!session_id || !streaming_product_id) {
          return jsonResponse({ error: 'Missing session_id or streaming_product_id' }, 400);
        }

        // Use RPC for atomic operation
        const { error } = await supabase.rpc('feature_streaming_product', {
          p_session_id: session_id,
          p_product_id: streaming_product_id,
        });

        if (error) throw error;

        // Broadcast to realtime
        await supabase.from('streaming_sessions_v2')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', session_id);

        return jsonResponse({ success: true });
      }

      case 'unfeature_product': {
        const { streaming_product_id } = params;

        const { error } = await supabase
          .from('streaming_products_v2')
          .update({ is_featured: false, featured_at: null })
          .eq('id', streaming_product_id);

        if (error) throw error;

        return jsonResponse({ success: true });
      }

      // ============================================
      // FLASH OFFERS
      // ============================================
      case 'create_flash_offer': {
        const {
          streaming_product_id,
          flash_price_usd,
          flash_stock,
          duration_seconds,
        } = params;

        if (!streaming_product_id || !flash_price_usd) {
          return jsonResponse({ error: 'Missing required parameters' }, 400);
        }

        const expiresAt = new Date(Date.now() + (duration_seconds || 300) * 1000);

        // Use RPC for atomic operation
        const { data, error } = await supabase.rpc('create_flash_offer', {
          p_product_id: streaming_product_id,
          p_flash_price: flash_price_usd,
          p_flash_stock: flash_stock || 10,
          p_expires_at: expiresAt.toISOString(),
        });

        if (error) throw error;

        return jsonResponse({
          success: true,
          flash_offer: {
            price: flash_price_usd,
            stock: flash_stock || 10,
            expires_at: expiresAt.toISOString(),
          },
        });
      }

      case 'end_flash_offer': {
        const { streaming_product_id } = params;

        const { error } = await supabase
          .from('streaming_products_v2')
          .update({
            is_flash_active: false,
            flash_price_usd: null,
            flash_stock: null,
            flash_expires_at: null,
          })
          .eq('id', streaming_product_id);

        if (error) throw error;

        return jsonResponse({ success: true });
      }

      // ============================================
      // PURCHASES
      // ============================================
      case 'process_purchase': {
        const {
          session_id,
          streaming_product_id,
          quantity,
          buyer_user_id,
          buyer_name,
          buyer_email,
          payment_method,
          payment_reference,
        } = params;

        if (!session_id || !streaming_product_id || !quantity) {
          return jsonResponse({ error: 'Missing required parameters' }, 400);
        }

        // Get product and session details
        const { data: product, error: productError } = await supabase
          .from('streaming_products_v2')
          .select('*, session:streaming_sessions_v2(host_user_id, organization_id)')
          .eq('id', streaming_product_id)
          .single();

        if (productError || !product) {
          return jsonResponse({ error: 'Product not found' }, 404);
        }

        // Determine price (flash vs regular)
        const isFlashPurchase = product.is_flash_active &&
          product.flash_expires_at &&
          new Date(product.flash_expires_at) > new Date();

        const unitPrice = isFlashPurchase ? product.flash_price_usd : product.live_price_usd;
        const totalAmount = unitPrice * quantity;

        // Check stock
        if (isFlashPurchase && product.flash_stock !== null) {
          if (product.flash_stock < quantity) {
            return jsonResponse({ error: 'Insufficient flash stock' }, 400);
          }
        } else if (product.stock_for_live > 0 && product.sold_count + quantity > product.stock_for_live) {
          return jsonResponse({ error: 'Insufficient stock' }, 400);
        }

        // Calculate commissions
        const platformCommission = totalAmount * COMMISSION_RATES.live_shopping;
        const flashBonus = isFlashPurchase ? totalAmount * COMMISSION_RATES.flash_offer_bonus : 0;
        const totalCommission = platformCommission + flashBonus;
        const creatorEarnings = totalAmount - totalCommission;

        // Create escrow hold
        const { data: escrow, error: escrowError } = await supabase
          .from('escrow_holds')
          .insert({
            wallet_id: null, // Will be linked when creator wallet is found
            amount_usd: creatorEarnings,
            hold_type: 'live_shopping',
            reference_type: 'streaming_purchase',
            reference_id: streaming_product_id,
            auto_release_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72h
            metadata: {
              session_id,
              product_id: product.product_id,
              quantity,
              unit_price: unitPrice,
              total_amount: totalAmount,
              commission: totalCommission,
              is_flash: isFlashPurchase,
              buyer_user_id,
              buyer_name,
              buyer_email,
            },
          })
          .select()
          .single();

        if (escrowError) {
          console.error('[streaming-shopping] Escrow error:', escrowError);
          // Continue anyway - escrow is non-blocking
        }

        // Update product stats atomically
        const { error: updateError } = await supabase.rpc('record_live_shopping_purchase', {
          p_session_id: session_id,
          p_product_id: streaming_product_id,
          p_quantity: quantity,
          p_amount_usd: totalAmount,
        });

        if (updateError) throw updateError;

        // If flash purchase, decrement flash stock
        if (isFlashPurchase && product.flash_stock !== null) {
          await supabase
            .from('streaming_products_v2')
            .update({ flash_stock: product.flash_stock - quantity })
            .eq('id', streaming_product_id);
        }

        // Insert purchase notification in chat
        await supabase.from('streaming_chat_messages_v2').insert({
          session_id,
          source_platform: 'kreoon',
          author_name: buyer_name || 'Cliente',
          content: `¡Compró ${quantity}x ${product.name}!`,
          message_type: 'purchase_notification',
          metadata: {
            product_id: product.product_id,
            streaming_product_id,
            quantity,
            amount: totalAmount,
            is_flash: isFlashPurchase,
          },
        });

        // Log event for analytics
        await supabase.from('streaming_analytics_v2').insert({
          session_id,
          timestamp: new Date().toISOString(),
          purchases: 1,
          revenue_usd: totalAmount,
          product_breakdown: {
            [streaming_product_id]: { quantity, revenue: totalAmount },
          },
        });

        return jsonResponse({
          success: true,
          purchase: {
            product_id: streaming_product_id,
            quantity,
            unit_price: unitPrice,
            total_amount: totalAmount,
            commission: totalCommission,
            creator_earnings: creatorEarnings,
            is_flash: isFlashPurchase,
            escrow_id: escrow?.id,
          },
        });
      }

      // ============================================
      // CART & CHECKOUT (for viewers)
      // ============================================
      case 'add_to_cart': {
        const { session_id, streaming_product_id, quantity, viewer_id } = params;

        // Store in session storage (client-side) or temp table
        // For now, just validate product availability
        const { data: product, error } = await supabase
          .from('streaming_products_v2')
          .select('*')
          .eq('id', streaming_product_id)
          .single();

        if (error || !product) {
          return jsonResponse({ error: 'Product not found' }, 404);
        }

        // Check availability
        const availableStock = product.is_flash_active
          ? product.flash_stock
          : (product.stock_for_live > 0 ? product.stock_for_live - product.sold_count : Infinity);

        if (quantity > availableStock) {
          return jsonResponse({
            error: 'Insufficient stock',
            available: availableStock,
          }, 400);
        }

        return jsonResponse({
          success: true,
          cart_item: {
            streaming_product_id,
            name: product.name,
            quantity,
            unit_price: product.is_flash_active ? product.flash_price_usd : product.live_price_usd,
            image_url: product.image_url,
            is_flash: product.is_flash_active,
            flash_expires_at: product.flash_expires_at,
          },
        });
      }

      case 'checkout': {
        const { session_id, cart_items, buyer_info, payment_info } = params;

        if (!cart_items?.length) {
          return jsonResponse({ error: 'Empty cart' }, 400);
        }

        const results = [];
        let totalAmount = 0;

        // Process each item
        for (const item of cart_items) {
          try {
            const purchaseResult = await processInternalPurchase(supabase, {
              session_id,
              streaming_product_id: item.streaming_product_id,
              quantity: item.quantity,
              buyer_user_id: buyer_info?.user_id,
              buyer_name: buyer_info?.name,
              buyer_email: buyer_info?.email,
              payment_method: payment_info?.method,
              payment_reference: payment_info?.reference,
            });

            results.push({
              streaming_product_id: item.streaming_product_id,
              success: true,
              amount: purchaseResult.total_amount,
            });

            totalAmount += purchaseResult.total_amount;
          } catch (err) {
            results.push({
              streaming_product_id: item.streaming_product_id,
              success: false,
              error: err instanceof Error ? err.message : 'Purchase failed',
            });
          }
        }

        return jsonResponse({
          success: results.every((r) => r.success),
          results,
          total_amount: totalAmount,
          order_id: crypto.randomUUID(),
        });
      }

      // ============================================
      // ANALYTICS & REPORTING
      // ============================================
      case 'get_session_sales': {
        const { session_id } = params;

        if (!session_id) {
          return jsonResponse({ error: 'Missing session_id' }, 400);
        }

        // Get products with sales
        const { data: products, error: productsError } = await supabase
          .from('streaming_products_v2')
          .select('*')
          .eq('session_id', session_id)
          .order('sold_count', { ascending: false });

        if (productsError) throw productsError;

        // Get session totals
        const { data: session, error: sessionError } = await supabase
          .from('streaming_sessions_v2')
          .select('total_revenue_usd, total_products_sold')
          .eq('id', session_id)
          .single();

        if (sessionError) throw sessionError;

        // Calculate metrics
        const totalProducts = products?.length || 0;
        const productsWithSales = products?.filter((p) => p.sold_count > 0).length || 0;
        const conversionRate = totalProducts > 0 ? (productsWithSales / totalProducts) * 100 : 0;

        return jsonResponse({
          products: products || [],
          summary: {
            total_revenue: session?.total_revenue_usd || 0,
            total_items_sold: session?.total_products_sold || 0,
            total_products: totalProducts,
            products_with_sales: productsWithSales,
            conversion_rate: Math.round(conversionRate * 10) / 10,
          },
        });
      }

      case 'get_top_products': {
        const { session_id, limit } = params;

        const { data, error } = await supabase
          .from('streaming_products_v2')
          .select('id, name, image_url, sold_count, revenue_usd, live_price_usd')
          .eq('session_id', session_id)
          .gt('sold_count', 0)
          .order('revenue_usd', { ascending: false })
          .limit(limit || 5);

        if (error) throw error;

        return jsonResponse({ products: data || [] });
      }

      // ============================================
      // INVENTORY SYNC
      // ============================================
      case 'sync_inventory': {
        const { streaming_product_id } = params;

        // Get streaming product
        const { data: streamingProduct, error: spError } = await supabase
          .from('streaming_products_v2')
          .select('product_id, sold_count')
          .eq('id', streaming_product_id)
          .single();

        if (spError || !streamingProduct) {
          return jsonResponse({ error: 'Streaming product not found' }, 404);
        }

        // Update main product inventory
        const { error: updateError } = await supabase.rpc('decrement_product_stock', {
          p_product_id: streamingProduct.product_id,
          p_quantity: streamingProduct.sold_count,
        });

        if (updateError) throw updateError;

        return jsonResponse({ success: true, synced_quantity: streamingProduct.sold_count });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('[streaming-shopping] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Internal helper for checkout
async function processInternalPurchase(
  supabase: ReturnType<typeof createClient>,
  params: {
    session_id: string;
    streaming_product_id: string;
    quantity: number;
    buyer_user_id?: string;
    buyer_name?: string;
    buyer_email?: string;
    payment_method?: string;
    payment_reference?: string;
  }
) {
  const { data: product } = await supabase
    .from('streaming_products_v2')
    .select('*')
    .eq('id', params.streaming_product_id)
    .single();

  if (!product) throw new Error('Product not found');

  const isFlash = product.is_flash_active &&
    product.flash_expires_at &&
    new Date(product.flash_expires_at) > new Date();

  const unitPrice = isFlash ? product.flash_price_usd : product.live_price_usd;
  const totalAmount = unitPrice * params.quantity;

  // Update sold count
  await supabase.rpc('record_live_shopping_purchase', {
    p_session_id: params.session_id,
    p_product_id: params.streaming_product_id,
    p_quantity: params.quantity,
    p_amount_usd: totalAmount,
  });

  return { total_amount: totalAmount };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
