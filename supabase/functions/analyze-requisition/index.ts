import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { requisition_id } = await req.json();
    if (!requisition_id) {
      return new Response(JSON.stringify({ error: "requisition_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch requisition + items, then center separately (no FK relationship)
    const { data: req_, error: re } = await admin
      .from("requisitions")
      .select("*, requisition_items(*)")
      .eq("id", requisition_id)
      .single();
    if (re) throw re;
    const { data: center } = await admin
      .from("ecde_centers")
      .select("name, capacity")
      .eq("id", req_.center_id)
      .maybeSingle();
    (req_ as any).ecde_centers = center;

    // Pull recent stats: number of students at center & last 6mo requisitions for context
    const { data: students } = await admin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("center_id", req_.center_id)
      .eq("is_active", true);

    const { count: studentCount } = await admin
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("center_id", req_.center_id)
      .eq("is_active", true);

    const sixMoAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString();
    const { data: pastReqs } = await admin
      .from("requisitions")
      .select("id, created_at, requisition_items(item_name, quantity, unit, category)")
      .eq("center_id", req_.center_id)
      .gte("created_at", sixMoAgo)
      .neq("id", requisition_id)
      .limit(20);

    const prompt = `You are an auditor for an Early Childhood Education (ECDE) program in Mandera County, Kenya. Detect anomalies in this resource requisition.

CENTER: ${req_.ecde_centers?.name ?? "Unknown"} (capacity: ${req_.ecde_centers?.capacity ?? "?"}, active students: ${studentCount ?? "?"})
REASON: ${req_.reason ?? "(none)"}
ITEMS:
${(req_.requisition_items || []).map((i: any) => `- ${i.item_name} (${i.category}): ${i.quantity} ${i.unit || "pcs"}`).join("\n")}

PAST 6 MONTHS REQUISITIONS (for baseline):
${(pastReqs || []).map((r: any) => `- ${r.created_at?.slice(0,10)}: ${(r.requisition_items||[]).map((x:any)=>`${x.item_name} x${x.quantity}`).join(", ")}`).join("\n") || "None"}

Score this requisition 0-100 (0=normal, 100=highly suspicious). Flag anomalies like quantity wildly disproportionate to student count, unusual item mix, duplicate of recent request, or items unsuitable for PP1/PP2 children.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a strict but fair audit assistant. Always respond via the report_anomaly tool." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_anomaly",
            description: "Report anomaly assessment",
            parameters: {
              type: "object",
              properties: {
                score: { type: "number", description: "0-100" },
                severity: { type: "string", enum: ["normal", "low", "medium", "high", "critical"] },
                reason: { type: "string", description: "Concise explanation (1-3 sentences)" },
              },
              required: ["score", "severity", "reason"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_anomaly" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway failed");
    }

    const data = await aiResp.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc ? JSON.parse(tc.function.arguments) : { score: 0, severity: "normal", reason: "No analysis" };

    await admin.from("requisitions").update({
      ai_anomaly_score: args.score,
      ai_anomaly_severity: args.severity,
      ai_anomaly_reason: args.reason,
      ai_analyzed_at: new Date().toISOString(),
    }).eq("id", requisition_id);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
