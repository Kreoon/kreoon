-- ============================================================================
-- APLICAR BENEFICIOS DE COMUNIDAD AL CONFIRMAR EMAIL
-- Trigger que se ejecuta cuando email_confirmed_at cambia de NULL a un valor
-- ============================================================================

-- Función que aplica los beneficios de comunidad
CREATE OR REPLACE FUNCTION public.apply_community_benefits_on_confirm()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_community_slug TEXT;
  v_user_type TEXT;
  v_community RECORD;
  v_membership_id UUID;
  v_is_brand BOOLEAN;
  v_tier subscription_tier;
  v_trial_end TIMESTAMPTZ;
  v_pricing JSONB;
  v_existing_sub UUID;
  v_existing_membership UUID;
BEGIN
  -- Solo procesar si email_confirmed_at cambió de NULL a un valor
  IF OLD.email_confirmed_at IS NOT NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener community slug y user_type del metadata
  v_community_slug := NEW.raw_user_meta_data->>'partner_community';
  v_user_type := NEW.raw_user_meta_data->>'user_type';

  -- Si no hay comunidad, salir
  IF v_community_slug IS NULL OR v_community_slug = '' THEN
    RETURN NEW;
  END IF;

  RAISE LOG 'apply_community_benefits_on_confirm: user=%, community=%, user_type=%',
    NEW.id, v_community_slug, v_user_type;

  -- Buscar la comunidad
  SELECT * INTO v_community
  FROM partner_communities
  WHERE slug = v_community_slug
    AND is_active = true
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW())
    AND (max_redemptions IS NULL OR current_redemptions < max_redemptions);

  IF v_community.id IS NULL THEN
    RAISE LOG 'apply_community_benefits_on_confirm: community not found or inactive: %', v_community_slug;
    RETURN NEW;
  END IF;

  -- Verificar si ya tiene membresía
  SELECT id INTO v_existing_membership
  FROM partner_community_memberships
  WHERE community_id = v_community.id
    AND user_id = NEW.id
  LIMIT 1;

  IF v_existing_membership IS NOT NULL THEN
    RAISE LOG 'apply_community_benefits_on_confirm: user already has membership: %', v_existing_membership;
    RETURN NEW;
  END IF;

  v_is_brand := v_user_type = 'brand';

  -- 1. Crear membresía
  INSERT INTO partner_community_memberships (
    community_id,
    user_id,
    free_months_granted,
    commission_discount_applied,
    bonus_tokens_granted,
    status,
    metadata
  ) VALUES (
    v_community.id,
    NEW.id,
    v_community.free_months,
    CASE WHEN v_is_brand THEN v_community.commission_discount_points ELSE 0 END,
    v_community.bonus_ai_tokens,
    'active',
    jsonb_build_object(
      'applied_via', 'email_confirmation_trigger',
      'applied_at_redemptions', v_community.current_redemptions,
      'user_type', v_user_type
    )
  )
  RETURNING id INTO v_membership_id;

  RAISE LOG 'apply_community_benefits_on_confirm: created membership %', v_membership_id;

  -- 2. Crear custom_pricing_agreement si hay descuento en comisiones (SOLO BRANDS)
  IF v_is_brand AND v_community.commission_discount_points > 0 THEN
    INSERT INTO custom_pricing_agreements (
      user_id,
      marketplace_fee_override,
      campaign_fee_override,
      is_active,
      notes,
      valid_from
    ) VALUES (
      NEW.id,
      GREATEST(0.05, 0.30 - (v_community.commission_discount_points::NUMERIC / 100)),
      GREATEST(0.05, 0.30 - (v_community.commission_discount_points::NUMERIC / 100)),
      true,
      'Descuento comunidad ' || v_community.name || ' (-' || v_community.commission_discount_points || ' pts) membership_id=' || v_membership_id,
      CURRENT_DATE
    );
    RAISE LOG 'apply_community_benefits_on_confirm: created pricing agreement for brand';
  END IF;

  -- 3. Desbloquear acceso sin llaves (SOLO BRANDS)
  IF v_is_brand THEN
    UPDATE profiles
    SET platform_access_unlocked = true
    WHERE id = NEW.id;
    RAISE LOG 'apply_community_benefits_on_confirm: unlocked platform access for brand';
  END IF;

  -- 4. Incrementar contador de redenciones
  UPDATE partner_communities
  SET current_redemptions = current_redemptions + 1
  WHERE id = v_community.id;

  -- 5. Otorgar tokens bonus si aplica
  -- Nota: balance_total es columna generada, solo insertamos balance_bonus
  IF v_community.bonus_ai_tokens > 0 THEN
    INSERT INTO ai_token_balances (user_id, balance_bonus)
    VALUES (NEW.id, v_community.bonus_ai_tokens)
    ON CONFLICT (user_id) DO UPDATE
    SET balance_bonus = COALESCE(ai_token_balances.balance_bonus, 0) + v_community.bonus_ai_tokens;
    RAISE LOG 'apply_community_benefits_on_confirm: granted % bonus tokens', v_community.bonus_ai_tokens;
  END IF;

  -- 6. Crear suscripción con meses gratis si aplica
  IF v_community.free_months > 0 THEN
    -- Verificar si ya tiene suscripción
    SELECT id INTO v_existing_sub
    FROM platform_subscriptions
    WHERE user_id = NEW.id
    LIMIT 1;

    IF v_existing_sub IS NULL THEN
      -- Determinar tier según tipo de usuario (usar cast a subscription_tier)
      v_tier := CASE WHEN v_is_brand
        THEN 'brand_starter'::subscription_tier
        ELSE 'creator_pro'::subscription_tier
      END;

      -- Precios según tier
      v_pricing := CASE WHEN v_is_brand
        THEN '{"monthly": 39, "annual": 390, "limits": {"users": 3, "ai_tokens": 4000, "storage_gb": 5, "content_per_month": 30}}'::jsonb
        ELSE '{"monthly": 29, "annual": 290, "limits": {"projects": 20, "ai_tokens": 3000, "storage_gb": 10}}'::jsonb
      END;

      v_trial_end := NOW() + (v_community.free_months || ' months')::INTERVAL;

      INSERT INTO platform_subscriptions (
        user_id,
        tier,
        status,
        billing_cycle,
        price_monthly,
        price_annual,
        current_price,
        trial_ends_at,
        current_period_start,
        current_period_end,
        plan_limits,
        metadata
      ) VALUES (
        NEW.id,
        v_tier,
        'trialing',
        'community_benefit',
        (v_pricing->>'monthly')::INTEGER,
        (v_pricing->>'annual')::INTEGER,
        0,
        v_trial_end,
        NOW(),
        v_trial_end,
        v_pricing->'limits',
        jsonb_build_object(
          'source', 'community_benefit_email_confirm',
          'free_months', v_community.free_months,
          'community_id', v_community.id,
          'community_slug', v_community.slug,
          'community_membership_id', v_membership_id,
          'user_type', v_user_type,
          'activated_at', NOW()
        )
      );
      RAISE LOG 'apply_community_benefits_on_confirm: created % subscription with % free months', v_tier, v_community.free_months;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger en auth.users
DROP TRIGGER IF EXISTS trg_apply_community_benefits ON auth.users;

CREATE TRIGGER trg_apply_community_benefits
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.apply_community_benefits_on_confirm();

-- Dar permisos necesarios
GRANT EXECUTE ON FUNCTION public.apply_community_benefits_on_confirm() TO service_role;

-- Comentario para documentación
COMMENT ON FUNCTION public.apply_community_benefits_on_confirm() IS
'Aplica automáticamente los beneficios de comunidad cuando un usuario confirma su email.
Lee partner_community y user_type del raw_user_meta_data y crea:
- Membresía en partner_community_memberships
- Custom pricing agreement con descuento (solo brands)
- Desbloqueo de acceso sin llaves (solo brands)
- Tokens bonus en ai_token_balances
- Suscripción con trial gratis en platform_subscriptions

Diferencias por tipo de usuario:
- BRANDS: brand_starter plan + acceso sin llaves + descuento comisiones
- FREELANCERS: creator_pro plan + tokens bonus (SIN acceso ni descuento)';
