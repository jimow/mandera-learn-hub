import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: any;
  description: string | null;
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ["system_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_settings" as any).select("*").order("category").order("key");
      if (error) throw error;
      return (data ?? []) as unknown as SystemSetting[];
    },
  });
}

export function useSettingsMap() {
  const { data, ...rest } = useSystemSettings();
  const map: Record<string, any> = {};
  (data ?? []).forEach((s) => {
    map[`${s.category}.${s.key}`] = s.value;
  });
  return { map, ...rest };
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ category, key, value }: { category: string; key: string; value: any }) => {
      const { data: existing } = await supabase.from("system_settings" as any)
        .select("id").eq("category", category).eq("key", key).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("system_settings" as any)
          .update({ value, updated_at: new Date().toISOString() }).eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("system_settings" as any).insert({ category, key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system_settings"] });
      toast.success("Setting saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAuditLogs(limit = 100) {
  return useQuery({
    queryKey: ["audit_logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs" as any)
        .select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useSendBroadcast() {
  return useMutation({
    mutationFn: async (payload: {
      audience: "all" | "role" | "center" | "subcounty";
      role?: string;
      center_id?: string;
      sub_county_id?: string;
      subject: string;
      message: string;
      channels: { email: boolean; sms: boolean };
    }) => {
      const { data, error } = await supabase.functions.invoke("send-broadcast", { body: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Broadcast sent: ${data?.recipients ?? 0} recipients (${data?.emailSent ?? 0} email, ${data?.smsSent ?? 0} SMS)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
