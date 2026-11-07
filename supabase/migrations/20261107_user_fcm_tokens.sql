-- ==============================================================================
-- Migração: 20261107_user_fcm_tokens.sql
-- Propósito: Registo e gestão relacional de tokens de push notifications (FCM)
-- Integração: Firebase Satélite (FCM) com Supabase Auth & RBAC
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL UNIQUE,
    device_type TEXT NOT NULL CHECK (device_type IN ('mobile_carrinha', 'tablet_kds', 'pos_loja', 'desktop_gestao', 'outro')),
    device_label TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de alta performance para busca e limpeza de tokens obsoletos
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_id ON public.user_fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_device_type ON public.user_fcm_tokens(device_type);

-- RLS (Row Level Security)
ALTER TABLE public.user_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Política: Utilizadores autenticados podem registar e atualizar os seus próprios tokens
CREATE POLICY "Utilizadores gerem os seus tokens FCM"
    ON public.user_fcm_tokens
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política: Service Role / Admin tem controlo total para envio e manutenção
CREATE POLICY "Service Role acesso total a tokens FCM"
    ON public.user_fcm_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.user_fcm_tokens IS 'Registo de tokens Firebase Cloud Messaging (FCM) para notificações operacionais em segundo plano.';