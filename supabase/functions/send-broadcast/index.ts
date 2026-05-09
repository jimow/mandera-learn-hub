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
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (error || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Permission: only admins can broadcast
    const userId = claims.claims.sub as string;
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "super_admin" || r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { audience, role, center_id, sub_county_id, subject, message, channels } = body;
    const useEmail: boolean = channels?.email !== false;
    const useSms: boolean = channels?.sms !== false;

    // Resolve recipients
    let usersQuery = admin.from("profiles").select("user_id, email, phone, full_name");
    if (audience === "role" && role) {
      const { data: ru } = await admin.from("user_roles").select("user_id").eq("role", role);
      const ids = (ru ?? []).map((r: any) => r.user_id);
      usersQuery = usersQuery.in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    } else if (audience === "center" && center_id) {
      const { data: uc } = await admin.from("user_center_assignments").select("user_id").eq("center_id", center_id).eq("is_active", true);
      const ids = (uc ?? []).map((r: any) => r.user_id);
      usersQuery = usersQuery.in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    } else if (audience === "subcounty" && sub_county_id) {
      const { data: us } = await admin.from("user_subcounty_assignments").select("user_id").eq("sub_county_id", sub_county_id).eq("is_active", true);
      const ids = (us ?? []).map((r: any) => r.user_id);
      usersQuery = usersQuery.in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    }
    const { data: recipients } = await usersQuery;

    // Settings master switches
    const { data: settings } = await admin.from("system_settings").select("category,key,value").in("category", ["notifications", "channels"]);
    const map = new Map((settings ?? []).map((s: any) => [`${s.category}.${s.key}`, s.value]));
    const emailMaster = map.get("notifications.email_enabled") !== false;
    const smsMaster = map.get("notifications.sms_enabled") !== false;
    const inAppMaster = map.get("notifications.inapp_enabled") !== false;

    let emailSent = 0, smsSent = 0, inAppSent = 0;

    for (const r of recipients ?? []) {
      // In-app
      if (inAppMaster) {
        await admin.from("notifications").insert({
          user_id: r.user_id, title: subject || "Broadcast", message,
          type: "broadcast", metadata: { broadcast: true }
        });
        inAppSent++;
      }
      // Email
      if (useEmail && emailMaster && r.email) {
        try {
          const RESEND = Deno.env.get("RESEND_API_KEY");
          if (RESEND) {
            const fromVal = String(map.get("channels.email_from") ?? "ECDE Mandera <onboarding@resend.dev>");
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
              body: JSON.stringify({ from: fromVal, to: [r.email], subject: subject || "Notification", html: `<p>${message}</p>` }),
            });
            emailSent++;
          }
        } catch (e) { console.error("email fail", e); }
      }
      // SMS
      if (useSms && smsMaster && r.phone) {
        try {
          const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`;
          await fetch(url, {
            method: "POST",
            headers: { Authorization: authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ to: r.phone, message }),
          });
          smsSent++;
        } catch (e) { console.error("sms fail", e); }
      }
    }

    // Audit
    await admin.from("audit_logs").insert({
      user_id: userId, action: "broadcast", resource_type: "notification", resource_id: null,
      metadata: { audience, role, center_id, sub_county_id, recipients: (recipients ?? []).length, emailSent, smsSent, inAppSent }
    });

    return new Response(JSON.stringify({ recipients: (recipients ?? []).length, emailSent, smsSent, inAppSent }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("send-broadcast error", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
