import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord {
  id: string;
  student_id?: string;
  teacher_id?: string;
  center_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  reason: string | null;
  recorded_by: string | null;
}

type Kind = "student" | "teacher";

const tableFor = (kind: Kind) => (kind === "student" ? "student_attendance" : "teacher_attendance");
const fkFor = (kind: Kind) => (kind === "student" ? "student_id" : "teacher_id");

export function useAttendance(kind: Kind, centerId: string | undefined, date: string) {
  return useQuery({
    queryKey: ["attendance", kind, centerId, date],
    queryFn: async () => {
      if (!centerId) return [] as AttendanceRecord[];
      const { data, error } = await supabase
        .from(tableFor(kind))
        .select("*")
        .eq("center_id", centerId)
        .eq("attendance_date", date);
      if (error) throw error;
      return (data || []) as AttendanceRecord[];
    },
    enabled: !!centerId && !!date,
  });
}

export function useUpsertAttendance(kind: Kind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      personId: string;
      centerId: string;
      date: string;
      status: AttendanceStatus;
      reason?: string | null;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const row = {
        [fkFor(kind)]: params.personId,
        center_id: params.centerId,
        attendance_date: params.date,
        status: params.status,
        reason: params.reason ?? null,
        recorded_by: userRes.user?.id ?? null,
      };
      const { error } = await supabase
        .from(tableFor(kind))
        .upsert(row, { onConflict: `${fkFor(kind)},attendance_date` });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance", kind] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAbsenteeismSummary(
  kind: Kind,
  centerId: string | undefined,
  fromDate: string,
  toDate: string,
) {
  return useQuery({
    queryKey: ["attendance-summary", kind, centerId, fromDate, toDate],
    queryFn: async () => {
      let q = supabase
        .from(tableFor(kind))
        .select("status, attendance_date, center_id")
        .gte("attendance_date", fromDate)
        .lte("attendance_date", toDate);
      if (centerId) q = q.eq("center_id", centerId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = data || [];
      const total = rows.length;
      const absent = rows.filter((r) => r.status === "absent").length;
      const late = rows.filter((r) => r.status === "late").length;
      const present = rows.filter((r) => r.status === "present").length;
      const excused = rows.filter((r) => r.status === "excused").length;
      const rate = total ? (absent / total) * 100 : 0;
      return { total, absent, late, present, excused, absenteeismRate: rate };
    },
    enabled: !!fromDate && !!toDate,
  });
}
