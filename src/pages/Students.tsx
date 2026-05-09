import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCenters } from "@/hooks/useCenters";
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
import { StudentImportDialog } from "@/components/students/StudentImportDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { DataActions } from "@/components/shared/DataActions";
import { TablePagination } from "@/components/shared/TablePagination";
import { useStudents, useDeleteStudent } from "@/hooks/useStudents";
import { usePagination } from "@/hooks/usePagination";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Student = Database["public"]["Tables"]["students"]["Row"];

const getApprovalStatusBadge = (status: string | null) => {
  switch (status) {
    case "approved_ministry":
      return <Badge variant="default">Approved</Badge>;
    case "approved_subcounty":
      return <Badge variant="secondary">Pending Ministry</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    case "pending":
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

export default function Students() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterClassLevel, setFilterClassLevel] = useState<string>("all");
  const [filterApproval, setFilterApproval] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCenter, setFilterCenter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
  const { data: students, isLoading } = useStudents();
  const { data: centers } = useCenters();
  const deleteStudent = useDeleteStudent();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission("students", "create");
  const canUpdate = hasPermission("students", "update");
  const canDelete = hasPermission("students", "delete");

  const activeFilterCount =
    (filterGender !== "all" ? 1 : 0) +
    (filterClassLevel !== "all" ? 1 : 0) +
    (filterApproval !== "all" ? 1 : 0) +
    (filterStatus !== "all" ? 1 : 0) +
    (filterCenter !== "all" ? 1 : 0);

  const clearFilters = () => {
    setFilterGender("all");
    setFilterClassLevel("all");
    setFilterApproval("all");
    setFilterStatus("all");
    setFilterCenter("all");
  };

  const filteredStudents = students?.filter((student) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      student.full_name.toLowerCase().includes(q) ||
      student.admission_number.toLowerCase().includes(q) ||
      student.parent_name?.toLowerCase().includes(q) ||
      student.parent_phone?.toLowerCase().includes(q);
    const matchesGender = filterGender === "all" || student.gender === filterGender;
    const matchesClass = filterClassLevel === "all" || (student as any).class_level === filterClassLevel;
    const matchesApproval =
      filterApproval === "all" || ((student as any).approval_status || "pending") === filterApproval;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" ? student.is_active : !student.is_active);
    const matchesCenter =
      filterCenter === "all" ||
      (filterCenter === "unassigned"
        ? !student.center_id
        : student.center_id === filterCenter);
    return matchesSearch && matchesGender && matchesClass && matchesApproval && matchesStatus && matchesCenter;
  }) || [];

  const {
    paginatedData,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
    itemsPerPage,
    goToPage,
    setItemsPerPage,
  } = usePagination({ data: filteredStudents });

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
            <>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
                <Upload className="w-4 h-4" />
                Import
              </Button>
              <Button onClick={() => { setEditingStudent(null); setDialogOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Student
              </Button>
            </>
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
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-popover" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filter Students</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1">
                    <X className="w-3 h-3" /> Clear
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={filterGender} onValueChange={setFilterGender}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class Level</Label>
                <Select value={filterClassLevel} onValueChange={setFilterClassLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pp1">PP1</SelectItem>
                    <SelectItem value="pp2">PP2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Approval</Label>
                <Select value={filterApproval} onValueChange={setFilterApproval}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved_subcounty">Pending Ministry</SelectItem>
                    <SelectItem value="approved_ministry">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Center</Label>
                <Select value={filterCenter} onValueChange={setFilterCenter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover max-h-64">
                    <SelectItem value="all">All Centers</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {centers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
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
              {paginatedData.map((student) => (
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
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={goToPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      <StudentDialog open={dialogOpen} onOpenChange={setDialogOpen} student={editingStudent} />
      <StudentImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
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
