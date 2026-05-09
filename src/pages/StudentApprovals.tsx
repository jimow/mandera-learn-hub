import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle, Eye, Search, Clock, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RejectDialog } from "@/components/approvals/RejectDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useApproveBySubcounty,
  useApproveByMinistry,
  useRejectStudent,
} from "@/hooks/useStudentApproval";
import {
  usePendingCenters,
  useApproveCenterL1,
  useApproveCenterL2,
  useRejectCenter,
} from "@/hooks/useCenters";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Student = Database["public"]["Tables"]["students"]["Row"] & {
  ecde_centers: { name: string; sub_county: string; ward: string } | null;
};

export default function StudentApprovals() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [studentToReject, setStudentToReject] = useState<Student | null>(null);
  const [selectedL1, setSelectedL1] = useState<Set<string>>(new Set());
  const [selectedL2, setSelectedL2] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const { hasPermission } = useAuth();

  // Permission-based access (granular - students). Falls back to legacy keys.
  const canViewLevel1 =
    hasPermission("approvals_students_l1", "read") || hasPermission("approvals_level1", "read");
  const canApproveLevel1 =
    hasPermission("approvals_students_l1", "update") || hasPermission("approvals_level1", "update");
  const canViewLevel2 =
    hasPermission("approvals_students_l2", "read") || hasPermission("approvals_level2", "read");
  const canApproveLevel2 =
    hasPermission("approvals_students_l2", "update") || hasPermission("approvals_level2", "update");

  // Center approval permissions
  const canViewCenterL1 = hasPermission("approvals_centers_l1", "read");
  const canApproveCenterL1 = hasPermission("approvals_centers_l1", "update");
  const canViewCenterL2 = hasPermission("approvals_centers_l2", "read");
  const canApproveCenterL2 = hasPermission("approvals_centers_l2", "update");

  const approveSubcounty = useApproveBySubcounty();
  const approveMinistry = useApproveByMinistry();
  const rejectStudent = useRejectStudent();

  // Center approval hooks
  const { data: pendingCentersL1, isLoading: loadingCentersL1 } = usePendingCenters("l1");
  const { data: pendingCentersL2, isLoading: loadingCentersL2 } = usePendingCenters("l2");
  const approveCenterL1 = useApproveCenterL1();
  const approveCenterL2 = useApproveCenterL2();
  const rejectCenter = useRejectCenter();

  // Fetch pending students (for sub-county approval)
  const { data: pendingStudents, isLoading: loadingPending } = useQuery({
    queryKey: ["pending-students", "subcounty"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, ecde_centers(name, sub_county, ward)")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Student[];
    },
    enabled: canViewLevel1,
  });

  // Fetch students awaiting ministry approval
  const { data: awaitingMinistry, isLoading: loadingMinistry } = useQuery({
    queryKey: ["pending-students", "ministry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, ecde_centers(name, sub_county, ward)")
        .eq("approval_status", "approved_subcounty")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Student[];
    },
    enabled: canViewLevel2,
  });

  // Fetch recently approved students
  const { data: approvedStudents, isLoading: loadingApproved } = useQuery({
    queryKey: ["approved-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, ecde_centers(name, sub_county, ward)")
        .eq("approval_status", "approved_ministry")
        .order("ministry_approval_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Student[];
    },
  });

  // Fetch rejected students
  const { data: rejectedStudents, isLoading: loadingRejected } = useQuery({
    queryKey: ["rejected-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, ecde_centers(name, sub_county, ward)")
        .eq("approval_status", "rejected")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Student[];
    },
  });

  const filterStudents = (students: Student[] | undefined) => {
    if (!students) return [];
    return students.filter(
      (student) =>
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.admission_number.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleView = (student: Student) => {
    setSelectedStudent(student);
    setViewDialogOpen(true);
  };

  const handleApproveSubcounty = async (studentId: string) => {
    await approveSubcounty.mutateAsync(studentId);
  };

  const handleApproveMinistry = async (studentId: string) => {
    await approveMinistry.mutateAsync(studentId);
  };

  const handleReject = (student: Student) => {
    setStudentToReject(student);
    setRejectDialogOpen(true);
  };

  const confirmReject = async (reason: string) => {
    if (studentToReject) {
      await rejectStudent.mutateAsync({ studentId: studentToReject.id, reason });
      setRejectDialogOpen(false);
      setStudentToReject(null);
    }
  };

  // Bulk approval
  const handleBulkApprove = async (level: "l1" | "l2") => {
    const ids = Array.from(level === "l1" ? selectedL1 : selectedL2);
    if (ids.length === 0) return;
    setBulkProcessing(true);
    try {
      const fn = level === "l1" ? approveSubcounty : approveMinistry;
      await Promise.all(ids.map((id) => fn.mutateAsync(id)));
      if (level === "l1") setSelectedL1(new Set());
      else setSelectedL2(new Set());
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleSelect = (level: "l1" | "l2", id: string) => {
    const setter = level === "l1" ? setSelectedL1 : setSelectedL2;
    const current = level === "l1" ? selectedL1 : selectedL2;
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const toggleSelectAll = (level: "l1" | "l2", students: Student[]) => {
    const current = level === "l1" ? selectedL1 : selectedL2;
    const setter = level === "l1" ? setSelectedL1 : setSelectedL2;
    if (current.size === students.length) setter(new Set());
    else setter(new Set(students.map((s) => s.id)));
  };

  const StudentTable = ({
    students,
    isLoading,
    showApproveLevel1,
    showApproveLevel2,
    showRejection,
  }: {
    students: Student[] | undefined;
    isLoading: boolean;
    showApproveLevel1?: boolean;
    showApproveLevel2?: boolean;
    showRejection?: boolean;
  }) => {
    const filtered = filterStudents(students);
    const level: "l1" | "l2" | null = showApproveLevel1 ? "l1" : showApproveLevel2 ? "l2" : null;
    const selected = level === "l1" ? selectedL1 : level === "l2" ? selectedL2 : new Set<string>();
    const canBulkApprove =
      (level === "l1" && canApproveLevel1) || (level === "l2" && canApproveLevel2);

    return (
      <div className="data-table">
        {level && canBulkApprove && filtered.length > 0 && (
          <div className="flex items-center justify-between p-3 border-b bg-muted/30">
            <p className="text-sm text-muted-foreground">
              {selected.size} of {filtered.length} selected
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={selected.size === 0 || bulkProcessing}
                onClick={() => handleBulkApprove(level)}
                className="gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                Bulk Approve ({selected.size})
              </Button>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No students found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {level && canBulkApprove && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selected.size > 0 && selected.size === filtered.length}
                      onCheckedChange={() => toggleSelectAll(level, filtered)}
                    />
                  </TableHead>
                )}
                <TableHead>Admission No.</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Center</TableHead>
                <TableHead>Sub-County</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Parent</TableHead>
                {showRejection && <TableHead>Rejection Reason</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((student) => (
                <TableRow key={student.id}>
                  {level && canBulkApprove && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(student.id)}
                        onCheckedChange={() => toggleSelect(level, student.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-sm">{student.admission_number}</TableCell>
                  <TableCell className="font-medium">{student.full_name}</TableCell>
                  <TableCell>{student.ecde_centers?.name || "Unassigned"}</TableCell>
                  <TableCell>{student.ecde_centers?.sub_county || "-"}</TableCell>
                  <TableCell>{format(new Date(student.date_of_birth), "PP")}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{student.parent_name}</p>
                      <p className="text-xs text-muted-foreground">{student.parent_phone}</p>
                    </div>
                  </TableCell>
                  {showRejection && (
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm text-destructive truncate" title={student.rejection_reason || ""}>
                        {student.rejection_reason || "-"}
                      </p>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleView(student)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {showApproveLevel1 && canApproveLevel1 && (
                        <>
                          <Button size="sm" className="gap-1" onClick={() => handleApproveSubcounty(student.id)} disabled={approveSubcounty.isPending}>
                            <CheckCircle className="w-4 h-4" /> Approve
                          </Button>
                          <Button variant="destructive" size="sm" className="gap-1" onClick={() => handleReject(student)}>
                            <XCircle className="w-4 h-4" /> Reject
                          </Button>
                        </>
                      )}
                      {showApproveLevel2 && canApproveLevel2 && (
                        <>
                          <Button size="sm" className="gap-1" onClick={() => handleApproveMinistry(student.id)} disabled={approveMinistry.isPending}>
                            <CheckCircle className="w-4 h-4" /> Final Approve
                          </Button>
                          <Button variant="destructive" size="sm" className="gap-1" onClick={() => handleReject(student)}>
                            <XCircle className="w-4 h-4" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  };

  // Centers approval table
  const CenterTable = ({
    centers,
    isLoading,
    level,
  }: {
    centers: any[] | undefined;
    isLoading: boolean;
    level: "l1" | "l2";
  }) => {
    const filtered = (centers || []).filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const canApprove = level === "l1" ? canApproveCenterL1 : canApproveCenterL2;
    return (
      <div className="data-table">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No centers awaiting approval</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Center Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Sub-County / Ward</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((center) => (
                <TableRow key={center.id}>
                  <TableCell className="font-mono text-sm">{center.code}</TableCell>
                  <TableCell className="font-medium">{center.name}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {center.location}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{center.sub_county} / {center.ward}</TableCell>
                  <TableCell>{center.capacity || 50}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {canApprove && (
                        <>
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() =>
                              level === "l1"
                                ? approveCenterL1.mutate(center.id)
                                : approveCenterL2.mutate(center.id)
                            }
                            disabled={approveCenterL1.isPending || approveCenterL2.isPending}
                          >
                            <CheckCircle className="w-4 h-4" />
                            {level === "l1" ? "Approve" : "Final Approve"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              const reason = window.prompt("Reason for rejection:");
                              if (reason) rejectCenter.mutate({ centerId: center.id, reason });
                            }}
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Approvals</h1>
        <p className="page-description">
          Review and approve student registrations and ECDE centers
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingStudents?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting sub-county approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Ministry</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{awaitingMinistry?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Pending final approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedStudents?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Fully approved students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedStudents?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Rejected registrations</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or admission number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          {canViewLevel1 && (
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending L1 ({pendingStudents?.length || 0})
            </TabsTrigger>
          )}
          {canViewLevel2 && (
            <TabsTrigger value="ministry" className="gap-2">
              <Building2 className="w-4 h-4" />
              Awaiting L2 ({awaitingMinistry?.length || 0})
            </TabsTrigger>
          )}
          {canViewCenterL1 && (
            <TabsTrigger value="centers_l1" className="gap-2">
              <MapPin className="w-4 h-4" />
              Centers L1 ({pendingCentersL1?.length || 0})
            </TabsTrigger>
          )}
          {canViewCenterL2 && (
            <TabsTrigger value="centers_l2" className="gap-2">
              <MapPin className="w-4 h-4" />
              Centers L2 ({pendingCentersL2?.length || 0})
            </TabsTrigger>
          )}
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="w-4 h-4" />
            Rejected
          </TabsTrigger>
        </TabsList>

        {canViewLevel1 && (
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Level 1 Approval (Sub-County)</CardTitle>
                <CardDescription>
                  Students awaiting first-level approval from sub-county education officers
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <StudentTable
                  students={pendingStudents}
                  isLoading={loadingPending}
                  showApproveLevel1
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canViewLevel2 && (
          <TabsContent value="ministry">
            <Card>
              <CardHeader>
                <CardTitle>Pending Level 2 Approval (Ministry)</CardTitle>
                <CardDescription>
                  Students approved by sub-county, awaiting final ministry approval
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <StudentTable
                  students={awaitingMinistry}
                  isLoading={loadingMinistry}
                  showApproveLevel2
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canViewCenterL1 && (
          <TabsContent value="centers_l1">
            <Card>
              <CardHeader>
                <CardTitle>Centers - Pending Level 1 Approval</CardTitle>
                <CardDescription>
                  ECDE centers awaiting first-level approval (Sub-County)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <CenterTable centers={pendingCentersL1} isLoading={loadingCentersL1} level="l1" />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canViewCenterL2 && (
          <TabsContent value="centers_l2">
            <Card>
              <CardHeader>
                <CardTitle>Centers - Pending Level 2 Approval</CardTitle>
                <CardDescription>
                  ECDE centers approved at L1 awaiting final ministry approval
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <CenterTable centers={pendingCentersL2} isLoading={loadingCentersL2} level="l2" />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Students</CardTitle>
              <CardDescription>
                Students who have been fully approved by both levels
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <StudentTable students={approvedStudents} isLoading={loadingApproved} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Registrations</CardTitle>
              <CardDescription>
                Student registrations that were rejected
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <StudentTable
                students={rejectedStudents}
                isLoading={loadingRejected}
                showRejection
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Student Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              Full information for {selectedStudent?.full_name}
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Admission Number</p>
                  <p className="font-medium">{selectedStudent.admission_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedStudent.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{selectedStudent.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {format(new Date(selectedStudent.date_of_birth), "PPP")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Center</p>
                  <p className="font-medium">
                    {selectedStudent.ecde_centers?.name || "Unassigned"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sub-County / Ward</p>
                  <p className="font-medium">
                    {selectedStudent.ecde_centers?.sub_county || "-"} / {selectedStudent.ecde_centers?.ward || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Parent/Guardian</p>
                  <p className="font-medium">{selectedStudent.parent_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Parent Phone</p>
                  <p className="font-medium">{selectedStudent.parent_phone}</p>
                </div>
                {selectedStudent.parent_email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Parent Email</p>
                    <p className="font-medium">{selectedStudent.parent_email}</p>
                  </div>
                )}
                {selectedStudent.address && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{selectedStudent.address}</p>
                  </div>
                )}
                {selectedStudent.special_needs && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Special Needs</p>
                    <p className="font-medium">{selectedStudent.special_needs}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-4 border-t">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge
                  variant={
                    selectedStudent.approval_status === "approved_ministry"
                      ? "default"
                      : selectedStudent.approval_status === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {selectedStudent.approval_status === "approved_ministry"
                    ? "Fully Approved"
                    : selectedStudent.approval_status === "approved_subcounty"
                    ? "Awaiting Ministry"
                    : selectedStudent.approval_status === "rejected"
                    ? "Rejected"
                    : "Pending"}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <RejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={confirmReject}
        studentName={studentToReject?.full_name || ""}
        isLoading={rejectStudent.isPending}
      />
    </div>
  );
}
