import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const recipients: string[] = Array.isArray(body.to) ? body.to : [body.to];
    const message: string = body.message;

    if (!message || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "to and message required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("AFRICASTALKING_API_KEY");
    const username = Deno.env.get("AFRICASTALKING_USERNAME") ?? "sandbox";
    const sender = Deno.env.get("AFRICASTALKING_SENDER_ID") ?? "";

    // Read sandbox preference from settings
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: sandboxSetting } = await admin.from("system_settings").select("value").eq("category", "channels").eq("key", "sms_sandbox").maybeSingle();
    const useSandbox = sandboxSetting?.value === true || username === "sandbox";

    const baseUrl = useSandbox
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";

    if (!apiKey) {
      console.log("AFRICASTALKING_API_KEY not set — logging SMS only", { recipients, message });
      return new Response(JSON.stringify({ status: "logged", note: "AT API key not configured", recipients, message }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const params = new URLSearchParams();
    params.append("username", username);
    params.append("to", recipients.join(","));
    params.append("message", message);
    if (sender) params.append("from", sender);

    const resp = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "apiKey": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: params.toString(),
    });
    const data = await resp.json();
    console.log("AT response", JSON.stringify(data));

    return new Response(JSON.stringify({ ok: resp.ok, sandbox: useSandbox, data }), {
      status: resp.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("send-sms error", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
