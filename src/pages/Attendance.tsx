import { useMemo, useState } from "react";
import { format, subDays, isToday } from "date-fns";
import {
  CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Search,
  Download,
  Lock,
  Pencil,
  Users,
} from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  badge: string;
  btn: string;
}[] = [
  {
    value: "present",
    label: "Present",
    badge: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
    btn: "data-[active=true]:bg-green-600 data-[active=true]:text-white data-[active=true]:border-green-600",
  },
  {
    value: "absent",
    label: "Absent",
    badge: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
    btn: "data-[active=true]:bg-red-600 data-[active=true]:text-white data-[active=true]:border-red-600",
  },
  {
    value: "late",
    label: "Late",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    btn: "data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500",
  },
  {
    value: "excused",
    label: "Excused",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    btn: "data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:border-blue-600",
  },
];

function StatPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            tone,
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
            {label}
          </p>
          <p className="text-xl font-semibold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const v = String(cell ?? "");
          return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AttendanceTab({
  kind,
  centerId,
  date,
  people,
  canEdit,
  isPastDate,
}: {
  kind: "student" | "teacher";
  centerId: string | undefined;
  date: string;
  people: Array<{ id: string; full_name: string }>;
  canEdit: boolean;
  isPastDate: boolean;
}) {
  const { data: records = [], isLoading } = useAttendance(kind, centerId, date);
  const upsert = useUpsertAttendance(kind);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const recordMap = useMemo(() => {
    const map: Record<string, { status: AttendanceStatus; reason: string | null }> = {};
    for (const r of records) {
      const id = (kind === "student" ? r.student_id : r.teacher_id) as string;
      map[id] = { status: r.status, reason: r.reason };
    }
    return map;
  }, [records, kind]);

  const filtered = useMemo(() => {
    return people.filter((p) => {
      if (search && !p.full_name.toLowerCase().includes(search.toLowerCase())) return false;
      const status = recordMap[p.id]?.status;
      if (statusFilter === "unrecorded") return !status;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      return true;
    });
  }, [people, search, statusFilter, recordMap]);

  const counts = useMemo(() => {
    let present = 0, absent = 0, late = 0, excused = 0, unrecorded = 0;
    for (const p of people) {
      const s = recordMap[p.id]?.status;
      if (s === "present") present++;
      else if (s === "absent") absent++;
      else if (s === "late") late++;
      else if (s === "excused") excused++;
      else unrecorded++;
    }
    return { present, absent, late, excused, unrecorded, total: people.length };
  }, [people, recordMap]);

  const handleSet = async (personId: string, status: AttendanceStatus) => {
    if (!centerId) {
      toast.error("Select a center first");
      return;
    }
    const existing = recordMap[personId];
    if (existing && editingId !== personId) {
      toast.error("Already marked. Use Edit to change.");
      return;
    }
    await upsert.mutateAsync({
      personId,
      centerId,
      date,
      status,
      reason: reasons[personId] ?? existing?.reason ?? null,
    });
    setEditingId(null);
  };

  const markAllPresent = async () => {
    if (!centerId) return;
    const todo = people.filter((p) => !recordMap[p.id]);
    if (todo.length === 0) {
      toast.info("Everyone is already marked");
      return;
    }
    for (const p of todo) {
      await upsert.mutateAsync({ personId: p.id, centerId, date, status: "present" });
    }
    toast.success(`Marked ${todo.length} as present`);
  };

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ["Name", "Date", "Status", "Reason"],
      ...people.map((p) => {
        const r = recordMap[p.id];
        return [p.full_name, date, r?.status ?? "unrecorded", r?.reason ?? ""];
      }),
    ];
    downloadCsv(`attendance_${kind}_${date}.csv`, rows);
  };

  const recordedPct = counts.total
    ? Math.round(((counts.total - counts.unrecorded) / counts.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="rounded-lg border bg-card p-3 flex flex-wrap gap-3 items-end shadow-sm">
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${kind === "student" ? "students" : "teachers"}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>
        <div className="space-y-1.5 min-w-[160px]">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unrecorded">Unrecorded</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllPresent}
            disabled={!canEdit || !centerId || people.length === 0 || counts.unrecorded === 0}
            className="h-9"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Mark unrecorded present
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="h-9">
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Progress / counts strip */}
      <div className="rounded-lg border bg-card p-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{counts.total - counts.unrecorded}</span>
          <span className="text-muted-foreground">/ {counts.total} recorded</span>
        </div>
        <div className="flex-1 min-w-[160px] h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${recordedPct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className={STATUS_OPTIONS[0].badge}>P {counts.present}</Badge>
          <Badge variant="secondary" className={STATUS_OPTIONS[1].badge}>A {counts.absent}</Badge>
          <Badge variant="secondary" className={STATUS_OPTIONS[2].badge}>L {counts.late}</Badge>
          <Badge variant="secondary" className={STATUS_OPTIONS[3].badge}>E {counts.excused}</Badge>
          {counts.unrecorded > 0 && (
            <Badge variant="outline">— {counts.unrecorded}</Badge>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead>Reason / Notes</TableHead>
              <TableHead className="text-right w-[360px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Loading attendance…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {people.length === 0
                    ? `No ${kind === "student" ? "students" : "teachers"} for the selected center`
                    : "No matches for the current filters"}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => {
              const current = recordMap[p.id];
              const opt = STATUS_OPTIONS.find((s) => s.value === current?.status);
              const isLocked = !!current && editingId !== p.id;
              const disabled = !canEdit || (isLocked && !canEdit);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>
                    {current ? (
                      <Badge variant="secondary" className={cn("capitalize border", opt?.badge)}>
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
                      disabled={isLocked || !canEdit}
                      onChange={(e) =>
                        setReasons((s) => ({ ...s, [p.id]: e.target.value }))
                      }
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end items-center">
                      {isLocked ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mr-1">
                            <Lock className="w-3 h-3" /> Marked
                          </span>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => setEditingId(p.id)}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                            </Button>
                          )}
                        </>
                      ) : (
                        STATUS_OPTIONS.map((o) => (
                          <Button
                            key={o.value}
                            size="sm"
                            variant="outline"
                            data-active={current?.status === o.value}
                            onClick={() => handleSet(p.id, o.value)}
                            disabled={disabled}
                            className={cn("h-8 px-2 text-xs", o.btn)}
                          >
                            {o.label}
                          </Button>
                        ))
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {isPastDate && (
        <p className="text-xs text-muted-foreground">
          Viewing a past date. New entries will be saved against {format(new Date(date), "PPP")}.
        </p>
      )}
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
  const isPastDate = !isToday(date);
  // Only center-level users can mark attendance (not admins or sub-county officers)
  const canEdit = hasRole("center_admin") || hasRole("teacher");

  const { data: students = [] } = useStudents(effectiveCenterId);
  const { data: teachers = [] } = useTeachers(effectiveCenterId);

  const fromDate = format(subDays(new Date(), 29), "yyyy-MM-dd");
  const toDate = format(new Date(), "yyyy-MM-dd");
  const { data: studentSummary } = useAbsenteeismSummary(
    "student",
    effectiveCenterId,
    fromDate,
    toDate,
  );
  const { data: teacherSummary } = useAbsenteeismSummary(
    "teacher",
    effectiveCenterId,
    fromDate,
    toDate,
  );

  const selectedCenterName =
    centers.find((c) => c.id === effectiveCenterId)?.name ?? "All centers";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Attendance</h1>
          <p className="text-muted-foreground">
            Record daily attendance and monitor absenteeism. Each person can only be marked once per day.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
          <CalendarIcon className="w-3.5 h-3.5" />
          {format(date, "EEEE, MMMM d, yyyy")}
          {isToday(date) && <span className="ml-1 text-primary font-semibold">· Today</span>}
        </Badge>
      </div>

      {/* Context bar */}
      <Card className="overflow-hidden border-l-4 border-l-primary">
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          {!isCenterBased && (
            <div className="space-y-1 min-w-[240px] flex-1">
              <Label className="text-xs text-muted-foreground">Center</Label>
              <Select value={selectedCenterId} onValueChange={setSelectedCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a center" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
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
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[240px] justify-start text-left font-normal"
                >
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
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Quick</Label>
            <div className="flex gap-1.5">
              <Button
                variant={isToday(date) ? "default" : "outline"}
                size="sm"
                onClick={() => setDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDate(subDays(new Date(), 1))}
              >
                Yesterday
              </Button>
            </div>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            Scope: <span className="text-foreground font-medium">{selectedCenterName}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatPill
          icon={CheckCircle2}
          label="Present (30d)"
          value={studentSummary?.present ?? 0}
          tone="bg-green-500/15 text-green-700 dark:text-green-400"
        />
        <StatPill
          icon={XCircle}
          label="Absent (30d)"
          value={studentSummary?.absent ?? 0}
          tone="bg-red-500/15 text-red-700 dark:text-red-400"
        />
        <StatPill
          icon={Clock}
          label="Late (30d)"
          value={studentSummary?.late ?? 0}
          tone="bg-amber-500/15 text-amber-700 dark:text-amber-400"
        />
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
            canEdit={canEdit}
            isPastDate={isPastDate}
          />
        </TabsContent>
        <TabsContent value="teachers" className="mt-4">
          <div className="mb-3 text-xs text-muted-foreground">
            Teacher absenteeism (30d): {teacherSummary?.absent ?? 0} absences out of{" "}
            {teacherSummary?.total ?? 0} records (
            {(teacherSummary?.absenteeismRate ?? 0).toFixed(1)}%)
          </div>
          <AttendanceTab
            kind="teacher"
            centerId={effectiveCenterId}
            date={dateStr}
            people={teachers.map((t) => ({ id: t.id, full_name: t.full_name }))}
            canEdit={canEdit}
            isPastDate={isPastDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
