-- =============================================================
-- AI TRAINING ADVANCED SYSTEM
-- =============================================================

-- Table: AI Conversation Flows (flujos conversacionales)
CREATE TABLE public.ai_conversation_flows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    trigger_keywords TEXT[] DEFAULT '{}',
    trigger_intent TEXT,
    flow_steps JSONB NOT NULL DEFAULT '[]',
    priority INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: AI Negative Rules (lo que NO debe hacer)
CREATE TABLE public.ai_negative_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('forbidden_phrase', 'forbidden_topic', 'sensitive_info', 'wrong_response')),
    pattern TEXT NOT NULL,
    reason TEXT,
    severity TEXT NOT NULL DEFAULT 'block' CHECK (severity IN ('warn', 'block', 'log')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: AI Positive Examples (cómo DEBE responder)
CREATE TABLE public.ai_positive_examples (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'general',
    user_question TEXT NOT NULL,
    ideal_response TEXT NOT NULL,
    context_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: AI Prompt Config (personalidad y tono)
CREATE TABLE public.ai_prompt_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
    assistant_role TEXT NOT NULL DEFAULT 'asistente virtual',
    personality TEXT DEFAULT 'profesional y amigable',
    tone TEXT DEFAULT 'formal pero cercano',
    language TEXT DEFAULT 'español',
    greeting TEXT DEFAULT 'Hola, ¿en qué puedo ayudarte?',
    fallback_message TEXT DEFAULT 'Lo siento, no tengo información sobre eso. ¿Puedo ayudarte con algo más?',
    max_response_length INTEGER DEFAULT 500,
    can_discuss_pricing BOOLEAN NOT NULL DEFAULT false,
    can_share_user_data BOOLEAN NOT NULL DEFAULT false,
    can_discuss_competitors BOOLEAN NOT NULL DEFAULT false,
    custom_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: AI Chat Feedback (feedback de usuarios)
CREATE TABLE public.ai_chat_feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
    message_id UUID,
    user_id UUID NOT NULL,
    rating TEXT NOT NULL CHECK (rating IN ('helpful', 'not_helpful', 'incorrect', 'offensive')),
    comment TEXT,
    ai_response TEXT,
    user_question TEXT,
    reviewed BOOLEAN NOT NULL DEFAULT false,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_conversation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_negative_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_positive_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_conversation_flows
CREATE POLICY "Org members can view flows"
ON public.ai_conversation_flows FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage flows"
ON public.ai_conversation_flows FOR ALL
USING (is_org_owner(auth.uid(), organization_id));

-- RLS Policies for ai_negative_rules
CREATE POLICY "Org members can view negative rules"
ON public.ai_negative_rules FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage negative rules"
ON public.ai_negative_rules FOR ALL
USING (is_org_owner(auth.uid(), organization_id));

-- RLS Policies for ai_positive_examples
CREATE POLICY "Org members can view positive examples"
ON public.ai_positive_examples FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage positive examples"
ON public.ai_positive_examples FOR ALL
USING (is_org_owner(auth.uid(), organization_id));

-- RLS Policies for ai_prompt_config
CREATE POLICY "Org members can view prompt config"
ON public.ai_prompt_config FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage prompt config"
ON public.ai_prompt_config FOR ALL
USING (is_org_owner(auth.uid(), organization_id));

-- RLS Policies for ai_chat_feedback
CREATE POLICY "Users can submit feedback"
ON public.ai_chat_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
ON public.ai_chat_feedback FOR SELECT
USING (user_id = auth.uid() OR is_org_owner(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage feedback"
ON public.ai_chat_feedback FOR UPDATE
USING (is_org_owner(auth.uid(), organization_id));

-- Enable realtime for chat feedback
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_feedback;