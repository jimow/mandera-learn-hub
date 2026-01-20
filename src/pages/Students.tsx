import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { StudentDialog } from "@/components/students/StudentDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { DataActions } from "@/components/shared/DataActions";
import { useStudents, useDeleteStudent } from "@/hooks/useStudents";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Student = Database["public"]["Tables"]["students"]["Row"];

const getApprovalStatusBadge = (status: string | null) => {
  switch (status) {
    case "approved_ministry":
      return <Badge className="bg-green-600 text-white">Approved</Badge>;
    case "approved_subcounty":
      return <Badge className="bg-amber-500 text-white">Pending Ministry</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    case "pending":
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

export default function Students() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
  const { data: students, isLoading } = useStudents();
  const deleteStudent = useDeleteStudent();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission("students", "create");
  const canUpdate = hasPermission("students", "update");
  const canDelete = hasPermission("students", "delete");

  const filteredStudents = students?.filter((student) =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.admission_number.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setDialogOpen(true);
  };

  const handleDelete = (student: Student) => {
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (studentToDelete) {
      await deleteStudent.mutateAsync(studentToDelete.id);
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  // Prepare data for export (remove nested objects and format for CSV)
  const exportData = filteredStudents.map(student => ({
    admission_number: student.admission_number,
    full_name: student.full_name,
    gender: student.gender,
    date_of_birth: student.date_of_birth,
    center: (student as any).ecde_centers?.name || "Unassigned",
    parent_name: student.parent_name,
    parent_phone: student.parent_phone,
    parent_email: student.parent_email || "",
    address: student.address || "",
    admission_date: student.admission_date || "",
    approval_status: (student as any).approval_status || "pending",
    is_active: student.is_active ? "Active" : "Inactive",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Students</h1>
          <p className="page-description">Manage student enrollment and records</p>
        </div>
        <div className="flex gap-2">
          <DataActions data={exportData} filename="students" />
          {canCreate && (
            <Button onClick={() => { setEditingStudent(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Student
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      <div className="data-table animate-fade-in">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No students found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission No.</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Center</TableHead>
                <TableHead>Parent/Guardian</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono text-sm">{student.admission_number}</TableCell>
                  <TableCell className="font-medium">{student.full_name}</TableCell>
                  <TableCell className="capitalize">{student.gender}</TableCell>
                  <TableCell>{(student as any).ecde_centers?.name || "Unassigned"}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{student.parent_name}</p>
                      <p className="text-xs text-muted-foreground">{student.parent_phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getApprovalStatusBadge((student as any).approval_status)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={student.is_active ? "default" : "secondary"}>
                      {student.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="w-4 h-4" /> View Details
                        </DropdownMenuItem>
                        {canUpdate && (
                          <DropdownMenuItem className="gap-2" onClick={() => handleEdit(student)}>
                            <Edit className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(student)}>
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <StudentDialog open={dialogOpen} onOpenChange={setDialogOpen} student={editingStudent} />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Student"
        description={`Are you sure you want to delete ${studentToDelete?.full_name}? This action cannot be undone.`}
        isLoading={deleteStudent.isPending}
      />
    </div>
  );
}
