import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  School,
  Printer,
  Copy,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useStudentAttendance } from "@/hooks/useStudents";
import { toast } from "sonner";
import { format, parseISO, differenceInYears } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: any | null;
}

const statusBadge = (status: string | null) => {
  switch (status) {
    case "approved_ministry":
      return <Badge>Approved</Badge>;
    case "approved_subcounty":
      return <Badge variant="secondary">Pending Ministry</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

export function StudentDetailsDialog({ open, onOpenChange, student }: Props) {
  const { data: attendance } = useStudentAttendance(student?.id);

  const stats = useMemo(() => {
    if (!attendance) return { present: 0, absent: 0, late: 0, total: 0, rate: 0 };
    const present = attendance.filter((a: any) => a.status === "present").length;
    const absent = attendance.filter((a: any) => a.status === "absent").length;
    const late = attendance.filter((a: any) => a.status === "late").length;
    const total = attendance.length;
    const rate = total ? Math.round((present / total) * 100) : 0;
    return { present, absent, late, total, rate };
  }, [attendance]);

  if (!student) return null;

  const age = student.date_of_birth
    ? differenceInYears(new Date(), parseISO(student.date_of_birth))
    : null;

  const copy = (val?: string | null, label = "Copied") => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    toast.success(`${label} to clipboard`);
  };

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <GraduationCap className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl">{student.full_name}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 mt-1">
                <span className="font-mono text-xs">{student.admission_number}</span>
                <span>·</span>
                <span className="capitalize">{student.gender}</span>
                {age !== null && <><span>·</span><span>{age} yrs</span></>}
                <span>·</span>
                <span className="uppercase">{student.class_level || "PP1"}</span>
              </DialogDescription>
              <div className="flex flex-wrap gap-2 mt-3">
                {statusBadge(student.approval_status)}
                <Badge variant={student.is_active ? "default" : "secondary"}>
                  {student.is_active ? "Active" : "Inactive"}
                </Badge>
                {student.special_needs && <Badge variant="outline">Special Needs</Badge>}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="actions">Quick Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Date of Birth"
                value={student.date_of_birth ? format(parseISO(student.date_of_birth), "PP") : "—"} />
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Admission Date"
                value={student.admission_date ? format(parseISO(student.admission_date), "PP") : "—"} />
              <InfoRow icon={<School className="w-4 h-4" />} label="Center"
                value={student.ecde_centers?.name || "Unassigned"} />
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="Ward / Sub-county"
                value={`${student.ecde_centers?.ward || "—"} / ${student.ecde_centers?.sub_county || "—"}`} />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Parent / Guardian
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoRow label="Name" value={student.parent_name} />
                <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={student.parent_phone} />
                <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={student.parent_email || "—"} />
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Address" value={student.address || "—"} />
              </div>
            </div>

            {student.special_needs && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Special Needs</h4>
                <p className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-md">{student.special_needs}</p>
              </div>
            )}

            {student.rejection_reason && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2 text-destructive">Rejection Reason</h4>
                <p className="text-sm bg-destructive/10 text-destructive p-3 rounded-md">{student.rejection_reason}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4 mt-4">
            <div className="grid grid-cols-4 gap-3">
              <StatBox label="Rate" value={`${stats.rate}%`} tone="primary" />
              <StatBox label="Present" value={stats.present} tone="success" />
              <StatBox label="Absent" value={stats.absent} tone="danger" />
              <StatBox label="Late" value={stats.late} tone="warn" />
            </div>
            <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
              {attendance && attendance.length > 0 ? (
                attendance.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 text-sm">
                    <div className="flex items-center gap-3">
                      {a.status === "present" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {a.status === "absent" && <XCircle className="w-4 h-4 text-destructive" />}
                      {a.status === "late" && <Clock className="w-4 h-4 text-amber-600" />}
                      <span className="font-medium">{format(parseISO(a.attendance_date), "EEE, PP")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{a.status}</Badge>
                      {a.reason && <span className="text-xs text-muted-foreground">{a.reason}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">No attendance records yet</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-2 mt-4">
            <ActionRow icon={<Copy />} label="Copy Admission Number"
              onClick={() => copy(student.admission_number, "Admission #")} />
            <ActionRow icon={<Phone />} label={`Call ${student.parent_name}`}
              onClick={() => student.parent_phone && (window.location.href = `tel:${student.parent_phone}`)}
              disabled={!student.parent_phone} />
            <ActionRow icon={<MessageSquare />} label="Send SMS to Parent"
              onClick={() => student.parent_phone && (window.location.href = `sms:${student.parent_phone}`)}
              disabled={!student.parent_phone} />
            <ActionRow icon={<Mail />} label="Email Parent"
              onClick={() => student.parent_email && (window.location.href = `mailto:${student.parent_email}`)}
              disabled={!student.parent_email} />
            <ActionRow icon={<Printer />} label="Print Profile" onClick={handlePrint} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
        {icon}{label}
      </p>
      <p className="text-sm font-medium break-words">{value || "—"}</p>
    </div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: number | string; tone: "primary" | "success" | "danger" | "warn" }) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    danger: "bg-destructive/10 text-destructive",
    warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <div className={`rounded-lg p-3 text-center ${tones[tone]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}

function ActionRow({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="w-full justify-start gap-3 h-11"
    >
      <span className="w-4 h-4 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
      {label}
    </Button>
  );
}
