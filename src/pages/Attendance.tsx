import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { CalendarIcon, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCenterAssignment } from "@/hooks/useUserCenterAssignment";
import { useCenters } from "@/hooks/useCenters";
import { useStudents } from "@/hooks/useStudents";
import { useTeachers } from "@/hooks/useTeachers";
import {
  AttendanceStatus,
  useAttendance,
  useUpsertAttendance,
  useAbsenteeismSummary,
} from "@/hooks/useAttendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "present", label: "Present", color: "bg-green-500/15 text-green-700 dark:text-green-400" },
  { value: "absent", label: "Absent", color: "bg-red-500/15 text-red-700 dark:text-red-400" },
  { value: "late", label: "Late", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { value: "excused", label: "Excused", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
];

function StatPill({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", tone)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AttendanceTab({
  kind,
  centerId,
  date,
  people,
}: {
  kind: "student" | "teacher";
  centerId: string | undefined;
  date: string;
  people: Array<{ id: string; full_name: string }>;
}) {
  const { data: records = [] } = useAttendance(kind, centerId, date);
  const upsert = useUpsertAttendance(kind);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const recordMap = useMemo(() => {
    const map: Record<string, { status: AttendanceStatus; reason: string | null }> = {};
    for (const r of records) {
      const id = (kind === "student" ? r.student_id : r.teacher_id) as string;
      map[id] = { status: r.status, reason: r.reason };
    }
    return map;
  }, [records, kind]);

  const handleSet = async (personId: string, status: AttendanceStatus) => {
    if (!centerId) {
      toast.error("Select a center first");
      return;
    }
    await upsert.mutateAsync({
      personId,
      centerId,
      date,
      status,
      reason: reasons[personId] ?? recordMap[personId]?.reason ?? null,
    });
  };

  const markAllPresent = async () => {
    if (!centerId) return;
    for (const p of people) {
      if (!recordMap[p.id]) {
        await upsert.mutateAsync({ personId: p.id, centerId, date, status: "present" });
      }
    }
    toast.success("Marked unrecorded as present");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={markAllPresent} disabled={!centerId || people.length === 0}>
          Mark unrecorded as present
        </Button>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason / Notes</TableHead>
              <TableHead className="text-right">Mark</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No {kind === "student" ? "students" : "teachers"} for the selected center
                </TableCell>
              </TableRow>
            )}
            {people.map((p) => {
              const current = recordMap[p.id];
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>
                    {current ? (
                      <Badge className={cn("capitalize", STATUS_OPTIONS.find((s) => s.value === current.status)?.color)} variant="secondary">
                        {current.status}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not recorded</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Optional reason"
                      defaultValue={current?.reason || ""}
                      onChange={(e) => setReasons((s) => ({ ...s, [p.id]: e.target.value }))}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {STATUS_OPTIONS.map((opt) => (
                        <Button
                          key={opt.value}
                          size="sm"
                          variant={current?.status === opt.value ? "default" : "outline"}
                          onClick={() => handleSet(p.id, opt.value)}
                          className="h-8 px-2 text-xs"
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function Attendance() {
  const { hasRole, isAdmin } = useAuth();
  const { data: centerAssignment } = useUserCenterAssignment();
  const { data: centers = [] } = useCenters();

  const isCenterBased = hasRole("center_admin") || hasRole("teacher");
  const assignedCenterId = centerAssignment?.center_id;

  const [selectedCenterId, setSelectedCenterId] = useState<string | undefined>(
    assignedCenterId ?? undefined,
  );
  const effectiveCenterId = isCenterBased ? assignedCenterId : selectedCenterId;

  const [date, setDate] = useState<Date>(new Date());
  const dateStr = format(date, "yyyy-MM-dd");

  const { data: students = [] } = useStudents(effectiveCenterId);
  const { data: teachers = [] } = useTeachers(effectiveCenterId);

  // Last 30 days summary for the visible scope
  const fromDate = format(subDays(new Date(), 29), "yyyy-MM-dd");
  const toDate = format(new Date(), "yyyy-MM-dd");
  const { data: studentSummary } = useAbsenteeismSummary("student", effectiveCenterId, fromDate, toDate);
  const { data: teacherSummary } = useAbsenteeismSummary("teacher", effectiveCenterId, fromDate, toDate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Attendance</h1>
        <p className="text-muted-foreground">Record daily attendance and monitor absenteeism</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          {!isCenterBased && (
            <div className="space-y-1 min-w-[240px]">
              <label className="text-xs text-muted-foreground">Center</label>
              <Select value={selectedCenterId} onValueChange={setSelectedCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a center" />
                </SelectTrigger>
                <SelectContent>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[220px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatPill icon={CheckCircle2} label="Present (30d, students)" value={studentSummary?.present ?? 0} tone="bg-green-500/15 text-green-700 dark:text-green-400" />
        <StatPill icon={XCircle} label="Absent (30d, students)" value={studentSummary?.absent ?? 0} tone="bg-red-500/15 text-red-700 dark:text-red-400" />
        <StatPill icon={Clock} label="Late (30d, students)" value={studentSummary?.late ?? 0} tone="bg-amber-500/15 text-amber-700 dark:text-amber-400" />
        <StatPill
          icon={FileText}
          label="Absenteeism rate (30d)"
          value={`${(studentSummary?.absenteeismRate ?? 0).toFixed(1)}%`}
          tone="bg-primary/15 text-primary"
        />
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-4">
          <AttendanceTab
            kind="student"
            centerId={effectiveCenterId}
            date={dateStr}
            people={students.map((s) => ({ id: s.id, full_name: s.full_name }))}
          />
        </TabsContent>
        <TabsContent value="teachers" className="mt-4">
          <div className="mb-3 text-xs text-muted-foreground">
            Teacher absenteeism (30d): {teacherSummary?.absent ?? 0} absences out of {teacherSummary?.total ?? 0} records ({(teacherSummary?.absenteeismRate ?? 0).toFixed(1)}%)
          </div>
          <AttendanceTab
            kind="teacher"
            centerId={effectiveCenterId}
            date={dateStr}
            people={teachers.map((t) => ({ id: t.id, full_name: t.full_name }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
