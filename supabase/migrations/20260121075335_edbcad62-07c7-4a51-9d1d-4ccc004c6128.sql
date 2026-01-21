-- Create API keys table for storing generated API keys
CREATE TABLE public.api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    key_hash text NOT NULL,
    key_prefix text NOT NULL,
    permissions jsonb NOT NULL DEFAULT '["read"]'::jsonb,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage API keys
CREATE POLICY "Super admins can manage API keys"
ON public.api_keys
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Create function to update timestamps
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();