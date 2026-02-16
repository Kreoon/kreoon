# KREOON ANALYTICS ENGINE - GUÍA DE INSTRUMENTACIÓN

Este documento indica exactamente dónde agregar cada llamada de tracking
en los componentes existentes de Kreoon.

---

## AUTH

### `src/components/auth/SignUpForm.tsx`

```tsx
import { useAuthAnalytics } from '@/analytics/hooks/useAuthAnalytics';

const { trackSignupStarted, trackSignupCompleted, trackSignupFailed } = useAuthAnalytics();

// En el useEffect inicial o cuando el form se monta:
useEffect(() => {
  trackSignupStarted({ signup_method: 'email', landing_page: window.location.href });
}, []);

// En el onSubmit exitoso:
const onSubmit = async (data) => {
  try {
    const { user } = await signUp(data);
    trackSignupCompleted(user.id, {
      signup_method: 'email',
      user_role: data.role,
      time_to_complete_seconds: getFormDuration(),
    });
  } catch (error) {
    trackSignupFailed(error.message, 'email');
  }
};
```

### `src/components/auth/LoginForm.tsx`

```tsx
import { useAuthAnalytics } from '@/analytics/hooks/useAuthAnalytics';

const { trackLogin, trackLoginFailed } = useAuthAnalytics();

// En onSubmit:
const onSubmit = async (data) => {
  try {
    await signIn(data);
    trackLogin({ login_method: 'email', remember_me: data.rememberMe });
  } catch (error) {
    trackLoginFailed(error.message, 'email');
  }
};
```

### `src/hooks/useAuth.ts` (logout)

```tsx
// En la función logout:
const logout = async () => {
  trackLogout();
  await supabase.auth.signOut();
};
```

---

## ONBOARDING

### `src/components/onboarding/OnboardingWizard.tsx`

```tsx
import { useAuthAnalytics } from '@/analytics/hooks/useAuthAnalytics';

const {
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackOnboardingCompleted,
  trackRoleSelected
} = useAuthAnalytics();

// Al montar el wizard:
useEffect(() => {
  trackOnboardingStarted();
  startTimeRef.current = Date.now();
}, []);

// Al completar cada paso:
const handleStepComplete = (stepNumber: number, stepName: string) => {
  trackOnboardingStepCompleted({
    step_number: stepNumber,
    step_name: stepName,
    total_steps: TOTAL_STEPS,
  });
};

// Al seleccionar rol:
const handleRoleSelect = (role: string) => {
  trackRoleSelected({ role, previous_role: previousRole });
};

// Al completar onboarding:
const handleComplete = () => {
  const totalTime = Math.round((Date.now() - startTimeRef.current) / 1000);
  trackOnboardingCompleted(totalTime);
};
```

---

## CONTENT

### `src/components/content/ContentUploader.tsx`

```tsx
import { useContentAnalytics } from '@/analytics/hooks/useContentAnalytics';

const {
  trackUploadStarted,
  trackUploadProgress,
  trackUploadCompleted,
  trackUploadFailed
} = useContentAnalytics();

// Al iniciar upload:
const handleUploadStart = (file: File) => {
  trackUploadStarted({
    content_type: file.type.startsWith('video') ? 'video' : 'image',
    file_size_bytes: file.size,
    file_format: file.type,
    source: 'upload',
  });
};

// En el progress callback:
const handleProgress = (progress: number) => {
  trackUploadProgress(contentId, progress, { content_type: 'video' });
};

// Al completar:
const handleComplete = (contentId: string, isFirstContent: boolean) => {
  trackUploadCompleted(contentId, uploadProps, isFirstContent);
};
```

### `src/components/content/VideoPlayer.tsx`

```tsx
import { useContentAnalytics } from '@/analytics/hooks/useContentAnalytics';

const {
  trackVideoPlayStarted,
  trackVideoPaused,
  trackVideoProgress,
  trackVideoCompleted
} = useContentAnalytics();

// En onPlay:
const handlePlay = () => {
  trackVideoPlayStarted({
    content_id: contentId,
    video_duration_seconds: duration,
    current_time_seconds: currentTime,
    percent_watched: 0,
    is_muted: isMuted,
    is_fullscreen: isFullscreen,
  });
};

// En onTimeUpdate (throttled):
const handleTimeUpdate = throttle(() => {
  const percent = (currentTime / duration) * 100;
  trackVideoProgress({ ...videoProps, percent_watched: percent });
}, 1000);

// En onEnded:
const handleEnded = () => {
  trackVideoCompleted({ ...videoProps, percent_watched: 100 });
};
```

### `src/components/content/ContentCard.tsx` (likes/saves)

```tsx
import { useContentAnalytics } from '@/analytics/hooks/useContentAnalytics';

const { trackContentLiked, trackContentSaved, trackContentShared } = useContentAnalytics();

// En handleLike:
const handleLike = () => {
  trackContentLiked(content.id, content.type);
  // ... rest of like logic
};

// En handleShare:
const handleShare = (method: string) => {
  trackContentShared({
    content_id: content.id,
    content_type: content.type,
    engagement_type: 'share',
    share_destination: method,
  });
};
```

---

## CAMPAIGNS

### `src/components/campaigns/CampaignCreateForm.tsx`

```tsx
import { useCampaignAnalytics } from '@/analytics/hooks/useCampaignAnalytics';

const { trackCampaignCreated, trackCampaignPublished } = useCampaignAnalytics();

// Al crear campaña:
const handleCreate = async (data) => {
  const campaign = await createCampaign(data);
  trackCampaignCreated({
    campaign_type: data.type,
    budget_usd: data.budget,
    target_creators_count: data.creatorsNeeded,
    duration_days: data.durationDays,
    content_types_required: data.contentTypes,
    platforms_targeted: data.platforms,
  });
};

// Al publicar:
const handlePublish = async () => {
  await publishCampaign(campaignId);
  trackCampaignPublished({ campaign_id: campaignId });
};
```

### `src/components/campaigns/CreatorApplications.tsx`

```tsx
import { useCampaignAnalytics } from '@/analytics/hooks/useCampaignAnalytics';

const { trackCreatorAccepted, trackCreatorRejected } = useCampaignAnalytics();

// Al aceptar creator:
const handleAccept = async (creatorId: string) => {
  await acceptCreator(campaignId, creatorId);
  trackCreatorAccepted({
    campaign_id: campaignId,
    creator_id: creatorId,
    action: 'accepted',
  });
};

// Al rechazar:
const handleReject = async (creatorId: string, reason: string) => {
  await rejectCreator(campaignId, creatorId, reason);
  trackCreatorRejected({
    campaign_id: campaignId,
    creator_id: creatorId,
    action: 'rejected',
    rejection_reason: reason,
  });
};
```

---

## AI TOOLS (DNA WIZARD)

### `src/components/ai/DNAWizard.tsx`

```tsx
import { useAIAnalytics } from '@/analytics/hooks/useAIAnalytics';

const {
  trackDNAWizardStarted,
  trackDNAWizardStepCompleted,
  trackDNAWizardCompleted,
  trackDNAWizardAbandoned,
  trackDNAAnalysisGenerated
} = useAIAnalytics();

// Al iniciar wizard:
const handleStart = (inputMethod: 'url' | 'upload' | 'manual') => {
  trackDNAWizardStarted(inputMethod);
};

// Al completar cada paso:
const handleStepComplete = (step: number, name: string) => {
  trackDNAWizardStepCompleted(step, name);
};

// Al generar análisis:
const handleAnalysisGenerated = (productId: string, type: string, success: boolean, time: number) => {
  trackDNAAnalysisGenerated(productId, type, success, time);
};

// Al completar todo el wizard:
const handleComplete = (productId: string) => {
  trackDNAWizardCompleted(productId, ['core', 'competitor', 'market']);
};

// Si el usuario abandona (en useEffect cleanup o navegación):
useEffect(() => {
  return () => {
    if (!isCompleted && currentStep > 0) {
      trackDNAWizardAbandoned(currentStep, 'navigation');
    }
  };
}, [currentStep, isCompleted]);
```

---

## BILLING

### `src/components/billing/PricingPage.tsx`

```tsx
import { useBillingAnalytics } from '@/analytics/hooks/useBillingAnalytics';

const { trackPricingPageViewed, trackPlanViewed, trackPlanSelected } = useBillingAnalytics();

// Al montar página:
useEffect(() => {
  trackPricingPageViewed();
}, []);

// Al hacer hover o click en plan:
const handlePlanView = (plan) => {
  trackPlanViewed({
    plan_id: plan.id,
    plan_name: plan.name,
    plan_price_usd: plan.price,
    billing_cycle: billingCycle,
    is_current_plan: plan.id === currentPlanId,
  });
};

// Al seleccionar plan:
const handleSelectPlan = (plan) => {
  trackPlanSelected({ ...planProps });
  navigate('/checkout');
};
```

### `src/components/billing/Checkout.tsx`

```tsx
import { useBillingAnalytics } from '@/analytics/hooks/useBillingAnalytics';

const {
  trackCheckoutStarted,
  trackPaymentCompleted,
  trackPaymentFailed
} = useBillingAnalytics();

// Al iniciar checkout:
useEffect(() => {
  trackCheckoutStarted({
    plan_id: selectedPlan.id,
    plan_name: selectedPlan.name,
    billing_cycle: billingCycle,
    price_usd: selectedPlan.price,
  });
}, []);

// Al completar pago (webhook o callback de Stripe):
const handlePaymentSuccess = (paymentIntent) => {
  trackPaymentCompleted({
    payment_method: 'card',
    amount_usd: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    is_recurring: true,
  });
};
```

### Stripe Webhook (Edge Function)

```tsx
// En el webhook de Stripe para subscription.created:
case 'customer.subscription.created':
  // Trackear trial o subscription según corresponda
  if (subscription.trial_end) {
    await trackTrialStarted({
      trial_days: calculateTrialDays(subscription.trial_end),
      plan_id: subscription.items.data[0].price.id,
      plan_name: getPlanName(subscription),
    });
  }
  break;

case 'invoice.paid':
  await trackPaymentCompleted({
    amount_usd: invoice.amount_paid / 100,
    // ...
  });
  break;
```

---

## PORTFOLIO / STORIES

### `src/components/portfolio/StoryEditor.tsx`

```tsx
import { usePortfolioAnalytics } from '@/analytics/hooks/usePortfolioAnalytics';

const { trackStoryCreated, trackStoryPublished, trackCardAdded } = usePortfolioAnalytics();

// Al crear story:
const handleCreate = () => {
  trackStoryCreated({ story_id: newStory.id, is_public: false });
};

// Al agregar card:
const handleAddCard = (card) => {
  trackCardAdded({
    story_id: storyId,
    card_id: card.id,
    card_type: card.type,
    card_position: cards.length,
  });
};

// Al publicar:
const handlePublish = () => {
  trackStoryPublished({ story_id: storyId, cards_count: cards.length, is_public: true });
};
```

### `src/pages/portfolio/[username].tsx` (página pública)

```tsx
import { usePortfolioAnalytics } from '@/analytics/hooks/usePortfolioAnalytics';

const { trackPortfolioVisited, trackPortfolioContactClicked } = usePortfolioAnalytics();

// Al cargar página:
useEffect(() => {
  trackPortfolioVisited({
    portfolio_owner_id: profile.id,
    visit_source: getVisitSource(), // 'direct' | 'search' | 'campaign' | etc
    referrer_url: document.referrer,
    is_owner: profile.id === currentUser?.id,
  });
}, [profile.id]);

// Al hacer click en contacto:
const handleContact = () => {
  trackPortfolioContactClicked({ portfolio_owner_id: profile.id });
};
```

---

## SEARCH & DISCOVERY

### `src/components/search/SearchBar.tsx`

```tsx
import { useDiscoveryAnalytics } from '@/analytics/hooks/useDiscoveryAnalytics';

const { trackSearchPerformed, trackSearchResultClicked } = useDiscoveryAnalytics();

// Al realizar búsqueda:
const handleSearch = async (query: string) => {
  const results = await search(query, filters);
  trackSearchPerformed({
    query,
    query_length: query.length,
    search_type: searchType,
    results_count: results.length,
    filters_applied: Object.keys(filters),
    page_number: 1,
  });
};

// Al hacer click en resultado:
const handleResultClick = (result, position) => {
  trackSearchResultClicked({
    query: currentQuery,
    result_type: result.type,
    result_id: result.id,
    result_position: position,
    total_results: totalResults,
  });
};
```

### `src/components/feed/Feed.tsx`

```tsx
import { useDiscoveryAnalytics } from '@/analytics/hooks/useDiscoveryAnalytics';

const { trackFeedViewed, trackFeedScrolled } = useDiscoveryAnalytics();

// Al cargar feed:
useEffect(() => {
  trackFeedViewed({ feed_type: 'discover', items_loaded: items.length });
}, []);

// Al hacer scroll (throttled):
const handleScroll = throttle((scrollPercent) => {
  if ([25, 50, 75, 100].includes(Math.round(scrollPercent))) {
    trackFeedScrolled({
      feed_type: 'discover',
      items_loaded: items.length,
      scroll_depth_percent: scrollPercent,
    });
  }
}, 1000);
```
