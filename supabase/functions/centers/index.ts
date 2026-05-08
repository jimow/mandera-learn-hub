import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate, hasApiPermission } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const auth = await authenticate(req, supabase);
    if (auth instanceof Response) return auth;
    const user = { id: auth.userId };

    const _writeAction = req.method === "GET" ? "read" : req.method === "DELETE" ? "delete" : "write";
    if (!hasApiPermission(auth, _writeAction)) {
      return new Response(JSON.stringify({ error: "Insufficient API key permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const subCounty = url.searchParams.get("sub_county");
    const ward = url.searchParams.get("ward");

    switch (req.method) {
      case "GET": {
        if (id) {
          // Get single center with counts
          const { data: center, error } = await supabase
            .from("ecde_centers")
            .select("*")
            .eq("id", id)
            .single();

          if (error) throw error;

          // Get counts
          const [studentsResult, teachersResult] = await Promise.all([
            supabase
              .from("students")
              .select("id", { count: "exact", head: true })
              .eq("center_id", id),
            supabase
              .from("teachers")
              .select("id", { count: "exact", head: true })
              .eq("center_id", id),
          ]);

          return new Response(JSON.stringify({
            ...center,
            students_count: studentsResult.count || 0,
            teachers_count: teachersResult.count || 0,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get all centers
        let query = supabase
          .from("ecde_centers")
          .select("*")
          .order("created_at", { ascending: false });

        if (subCounty) {
          query = query.eq("sub_county", subCounty);
        }
        if (ward) {
          query = query.eq("ward", ward);
        }

        const { data: centers, error } = await query;
        if (error) throw error;

        // Get counts for each center
        const centersWithCounts = await Promise.all(
          centers.map(async (center) => {
            const [studentsResult, teachersResult] = await Promise.all([
              supabase
                .from("students")
                .select("id", { count: "exact", head: true })
                .eq("center_id", center.id),
              supabase
                .from("teachers")
                .select("id", { count: "exact", head: true })
                .eq("center_id", center.id),
            ]);

            return {
              ...center,
              students_count: studentsResult.count || 0,
              teachers_count: teachersResult.count || 0,
            };
          })
        );

        return new Response(JSON.stringify(centersWithCounts), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "POST": {
        const body = await req.json();
        const { data, error } = await supabase
          .from("ecde_centers")
          .insert(body)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "PUT": {
        if (!id) {
          return new Response(JSON.stringify({ error: "ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();
        const { data, error } = await supabase
          .from("ecde_centers")
          .update(body)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "DELETE": {
        if (!id) {
          return new Response(JSON.stringify({ error: "ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabase
          .from("ecde_centers")
          .delete()
          .eq("id", id);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
