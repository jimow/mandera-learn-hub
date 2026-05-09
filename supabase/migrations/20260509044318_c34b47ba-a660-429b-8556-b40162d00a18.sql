
-- ============== SYSTEM SETTINGS ==============
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category, key)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view settings" ON public.system_settings
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Super admins manage settings" ON public.system_settings
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_system_settings_updated
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.system_settings (category, key, value, description) VALUES
  ('branding', 'system_name', '"ECDE Mandera"'::jsonb, 'System display name'),
  ('branding', 'primary_color', '"#1e40af"'::jsonb, 'Primary brand color (hex)'),
  ('branding', 'logo_url', '""'::jsonb, 'URL to system logo'),
  ('branding', 'support_email', '"support@mandera.go.ke"'::jsonb, 'Support contact email'),
  ('branding', 'support_phone', '""'::jsonb, 'Support contact phone'),
  ('notifications', 'email_enabled', 'true'::jsonb, 'Master switch for email'),
  ('notifications', 'sms_enabled', 'true'::jsonb, 'Master switch for SMS'),
  ('notifications', 'inapp_enabled', 'true'::jsonb, 'Master switch for in-app'),
  ('notifications', 'events', '{"approval_pending":true,"approval_approved":true,"approval_rejected":true,"low_stock":true,"delivery_received":true,"requisition_anomaly":true,"user_welcome":true,"role_assigned":true}'::jsonb, 'Per-event channel triggers'),
  ('privacy', 'mask_pii', 'true'::jsonb, 'Mask PII for non-privileged roles'),
  ('privacy', 'retention_days', '1825'::jsonb, 'Retention period in days (default 5y)'),
  ('privacy', 'require_consent', 'true'::jsonb, 'Require consent for student/teacher records'),
  ('privacy', 'data_protection_officer', '"dpo@mandera.go.ke"'::jsonb, 'DPO contact'),
  ('approvals', 'ai_anomaly_threshold', '0.7'::jsonb, 'Minimum score to flag anomaly'),
  ('approvals', 'ai_auto_block_high', 'false'::jsonb, 'Auto-block high severity requisitions'),
  ('approvals', 'require_l2_for_centers', 'true'::jsonb, 'Require ministry approval for centers'),
  ('channels', 'sms_provider', '"africastalking"'::jsonb, 'SMS provider'),
  ('channels', 'sms_sandbox', 'true'::jsonb, 'Use Africa''s Talking sandbox'),
  ('channels', 'email_provider', '"resend"'::jsonb, 'Email provider'),
  ('channels', 'email_from', '"ECDE Mandera <onboarding@resend.dev>"'::jsonb, 'From address'),
  ('security', 'session_timeout_minutes', '60'::jsonb, 'Session inactivity timeout'),
  ('security', 'password_min_length', '8'::jsonb, 'Minimum password length'),
  ('security', 'enforce_2fa_admins', 'false'::jsonb, 'Require 2FA for admins'),
  ('locale', 'timezone', '"Africa/Nairobi"'::jsonb, 'Default timezone'),
  ('locale', 'date_format', '"DD/MM/YYYY"'::jsonb, 'Date display format'),
  ('locale', 'currency', '"KES"'::jsonb, 'Default currency')
ON CONFLICT (category, key) DO NOTHING;

-- ============== AUDIT LOGS ==============
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON public.audit_logs(resource_type, resource_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit" ON public.audit_logs
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated insert audit" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============== NOTIFICATION PREFERENCES ==============
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT true,
  inapp_enabled boolean DEFAULT true,
  events jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prefs" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all prefs" ON public.notification_preferences
  FOR SELECT USING (is_admin(auth.uid()));

CREATE TRIGGER trg_notif_prefs_updated
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== CONSENT FIELDS ==============
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS consent_given boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_date timestamptz,
  ADD COLUMN IF NOT EXISTS consent_signed_by text,
  ADD COLUMN IF NOT EXISTS retention_until date,
  ADD COLUMN IF NOT EXISTS data_export_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS data_deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS anonymized boolean DEFAULT false;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS consent_given boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_date timestamptz,
  ADD COLUMN IF NOT EXISTS retention_until date,
  ADD COLUMN IF NOT EXISTS anonymized boolean DEFAULT false;

-- ============== HELPER FUNCTIONS ==============
CREATE OR REPLACE FUNCTION public.can_view_pii(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT is_admin(_user_id)
      OR has_role(_user_id, 'education_officer'::app_role)
      OR has_role(_user_id, 'center_admin'::app_role)
      OR public.has_permission(_user_id, 'students', 'view_sensitive')
      OR public.has_permission(_user_id, 'teachers', 'view_sensitive');
$$;

CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _resource_type text,
  _resource_id uuid,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  _email text;
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.audit_logs(user_id, user_email, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), _email, _action, _resource_type, _resource_id, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_setting(_category text, _key text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT value FROM public.system_settings WHERE category=_category AND key=_key;
$$;
