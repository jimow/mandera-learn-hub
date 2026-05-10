import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type AttendanceKind = "student" | "teacher";

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

export function useAttendance(kind: AttendanceKind, centerId: string | undefined, date: string) {
  return useQuery({
    queryKey: ["attendance", kind, centerId, date],
    queryFn: async () => {
      if (!centerId) return [] as AttendanceRecord[];
      const query = kind === "student"
        ? supabase.from("student_attendance").select("*").eq("center_id", centerId).eq("attendance_date", date)
        : supabase.from("teacher_attendance").select("*").eq("center_id", centerId).eq("attendance_date", date);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AttendanceRecord[];
    },
    enabled: !!centerId && !!date,
  });
}

export function useUpsertAttendance(kind: AttendanceKind) {
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
      const recordedBy = userRes.user?.id ?? null;

      if (kind === "student") {
        const { error } = await supabase.from("student_attendance").upsert(
          {
            student_id: params.personId,
            center_id: params.centerId,
            attendance_date: params.date,
            status: params.status,
            reason: params.reason ?? null,
            recorded_by: recordedBy,
          },
          { onConflict: "student_id,attendance_date" },
        );
        if (error) throw error;
      } else {
        const { error } = await supabase.from("teacher_attendance").upsert(
          {
            teacher_id: params.personId,
            center_id: params.centerId,
            attendance_date: params.date,
            status: params.status,
            reason: params.reason ?? null,
            recorded_by: recordedBy,
          },
          { onConflict: "teacher_id,attendance_date" },
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance", kind] });
      qc.invalidateQueries({ queryKey: ["attendance-summary", kind] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAbsenteeismSummary(
  kind: AttendanceKind,
  centerId: string | undefined,
  fromDate: string,
  toDate: string,
) {
  return useQuery({
    queryKey: ["attendance-summary", kind, centerId, fromDate, toDate],
    queryFn: async () => {
      const base = kind === "student"
        ? supabase.from("student_attendance").select("status,attendance_date,center_id")
        : supabase.from("teacher_attendance").select("status,attendance_date,center_id");
      let q = base.gte("attendance_date", fromDate).lte("attendance_date", toDate);
      if (centerId) q = q.eq("center_id", centerId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []) as Array<{ status: AttendanceStatus }>;
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
