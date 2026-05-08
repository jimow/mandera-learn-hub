// Shared auth helper: supports both Supabase JWT and ecde_ API keys
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  userId: string;
  permissions: string[]; // empty for JWT users (use RLS); populated for API keys
  isApiKey: boolean;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function authenticate(
  req: Request,
  supabase: SupabaseClient,
): Promise<AuthResult | Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const token = authHeader.replace("Bearer ", "").trim();

  // API key path
  if (token.startsWith("ecde_")) {
    const keyHash = await sha256Hex(token);
    const { data: keyRow, error } = await supabase
      .from("api_keys")
      .select("id, user_id, permissions, is_active, expires_at")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (error || !keyRow || !keyRow.is_active) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), { status: 401, headers: corsHeaders });
    }
    if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "API key expired" }), { status: 401, headers: corsHeaders });
    }

    // Update last_used_at (fire and forget)
    supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id).then(() => {});

    return {
      userId: keyRow.user_id,
      permissions: Array.isArray(keyRow.permissions) ? keyRow.permissions as string[] : [],
      isApiKey: true,
    };
  }

  // JWT path
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
  }
  return { userId: user.id, permissions: [], isApiKey: false };
}

export function hasApiPermission(auth: AuthResult, action: "read" | "write" | "delete"): boolean {
  if (!auth.isApiKey) return true; // JWT users rely on RLS
  return auth.permissions.includes(action) || auth.permissions.includes("*");
}
