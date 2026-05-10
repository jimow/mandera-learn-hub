import { useState, useMemo } from "react";
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, ArrowRightLeft, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { TeacherDialog } from "@/components/teachers/TeacherDialog";
import { TeacherTransferDialog } from "@/components/teachers/TeacherTransferDialog";
import { TeacherImportDialog } from "@/components/teachers/TeacherImportDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { DataActions } from "@/components/shared/DataActions";
import { TablePagination } from "@/components/shared/TablePagination";
import { useTeachers, useDeleteTeacher } from "@/hooks/useTeachers";
import { useCenters } from "@/hooks/useCenters";
import { usePagination } from "@/hooks/usePagination";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/hooks/usePrivacy";
import type { Database } from "@/integrations/supabase/types";

type Teacher = Database["public"]["Tables"]["teachers"]["Row"];

export default function Teachers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCenter, setFilterCenter] = useState<string>("all");
  const [filterQualification, setFilterQualification] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [teacherToTransfer, setTeacherToTransfer] = useState<Teacher | null>(null);

  const { data: teachers, isLoading } = useTeachers();
  const { data: centers } = useCenters();
  const deleteTeacher = useDeleteTeacher();
  const { hasPermission } = useAuth();
  const { mask } = usePrivacy();

  const canCreate = hasPermission("teachers", "create");
  const canUpdate = hasPermission("teachers", "update");
  const canDelete = hasPermission("teachers", "delete");
  const canTransfer = hasPermission("teachers", "transfer");
  const canImport = hasPermission("teachers", "import") || canCreate;

  const qualifications = useMemo(() => {
    const set = new Set<string>();
    (teachers || []).forEach((t) => {
      if (t.qualification?.trim()) set.add(t.qualification.trim());
    });
    return Array.from(set).sort();
  }, [teachers]);

  const activeFilterCount =
    (filterGender !== "all" ? 1 : 0) +
    (filterStatus !== "all" ? 1 : 0) +
    (filterCenter !== "all" ? 1 : 0) +
    (filterQualification !== "all" ? 1 : 0);

  const clearFilters = () => {
    setFilterGender("all");
    setFilterStatus("all");
    setFilterCenter("all");
    setFilterQualification("all");
  };

  const filteredTeachers = (teachers || []).filter((teacher) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      teacher.full_name.toLowerCase().includes(q) ||
      teacher.employee_number.toLowerCase().includes(q) ||
      teacher.phone?.toLowerCase().includes(q) ||
      teacher.email?.toLowerCase().includes(q) ||
      teacher.national_id?.toLowerCase().includes(q);
    const matchesGender = filterGender === "all" || teacher.gender === filterGender;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" ? teacher.is_active : !teacher.is_active);
    const matchesCenter =
      filterCenter === "all" ||
      (filterCenter === "unassigned" ? !teacher.center_id : teacher.center_id === filterCenter);
    const matchesQual =
      filterQualification === "all" || teacher.qualification === filterQualification;
    return matchesSearch && matchesGender && matchesStatus && matchesCenter && matchesQual;
  });

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
  } = usePagination({ data: filteredTeachers });

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setDialogOpen(true);
  };

  const handleDelete = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setDeleteDialogOpen(true);
  };

  const handleTransfer = (teacher: Teacher) => {
    setTeacherToTransfer(teacher);
    setTransferDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (teacherToDelete) {
      await deleteTeacher.mutateAsync(teacherToDelete.id);
      setDeleteDialogOpen(false);
      setTeacherToDelete(null);
    }
  };

  const exportData = filteredTeachers.map((t) => ({
    employee_number: t.employee_number,
    full_name: t.full_name,
    gender: t.gender,
    national_id: t.national_id,
    date_of_birth: t.date_of_birth || "",
    phone: t.phone || "",
    email: t.email || "",
    qualification: t.qualification || "",
    specialization: t.specialization || "",
    employment_date: t.employment_date || "",
    center: (t as any).ecde_centers?.name || "Unassigned",
    is_active: t.is_active ? "Active" : "Inactive",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Teachers</h1>
          <p className="page-description">Manage ECDE teachers and their assignments</p>
        </div>
        <div className="flex gap-2">
          <DataActions data={exportData} filename="teachers" />
          {canImport && (
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              Import
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => { setEditingTeacher(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Teacher
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Name, employee no, phone, email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:flex lg:flex-row lg:flex-1">
            <div className="space-y-1.5 lg:flex-1 lg:min-w-[120px]">
              <Label className="text-xs text-muted-foreground">Gender</Label>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 lg:flex-1 lg:min-w-[120px]">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 lg:flex-1 lg:min-w-[160px]">
              <Label className="text-xs text-muted-foreground">Center</Label>
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
            <div className="space-y-1.5 lg:flex-1 lg:min-w-[140px]">
              <Label className="text-xs text-muted-foreground">Qualification</Label>
              <Select
                value={filterQualification}
                onValueChange={setFilterQualification}
                disabled={qualifications.length === 0}
              >
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent className="bg-popover max-h-64">
                  <SelectItem value="all">All</SelectItem>
                  {qualifications.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="gap-1 self-end text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" /> Clear ({activeFilterCount})
            </Button>
          )}
        </div>
      </div>

      <div className="data-table animate-fade-in">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filteredTeachers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No teachers found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee No.</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Center</TableHead>
                <TableHead>Qualification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-mono text-sm">{teacher.employee_number}</TableCell>
                  <TableCell className="font-medium">{teacher.full_name}</TableCell>
                  <TableCell className="capitalize">{teacher.gender}</TableCell>
                  <TableCell>{mask(teacher.phone) || "-"}</TableCell>
                  <TableCell>{(teacher as any).ecde_centers?.name || "Unassigned"}</TableCell>
                  <TableCell>{teacher.qualification || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={teacher.is_active ? "default" : "secondary"}>
                      {teacher.is_active ? "Active" : "Inactive"}
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
                          <Eye className="w-4 h-4" /> View Profile
                        </DropdownMenuItem>
                        {canUpdate && (
                          <DropdownMenuItem className="gap-2" onClick={() => handleEdit(teacher)}>
                            <Edit className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                        )}
                        {canTransfer && (
                          <DropdownMenuItem className="gap-2" onClick={() => handleTransfer(teacher)}>
                            <ArrowRightLeft className="w-4 h-4" /> Transfer
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(teacher)}>
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

      <TeacherDialog open={dialogOpen} onOpenChange={setDialogOpen} teacher={editingTeacher} />
      <TeacherTransferDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen} teacher={teacherToTransfer} />
      <TeacherImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Teacher"
        description={`Are you sure you want to delete ${teacherToDelete?.full_name}? This action cannot be undone.`}
        isLoading={deleteTeacher.isPending}
      />
    </div>
  );
}
