import { useState, useMemo } from "react";
import { Plus, MoreVertical, Eye, Edit, Trash2, ArrowRightLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterBar, type FilterDef } from "@/components/shared/FilterBar";
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
  const [filterSubCounty, setFilterSubCounty] = useState<string>("all");
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

  const subCounties = useMemo(() => {
    const set = new Set<string>();
    (centers || []).forEach((c: any) => {
      if (c.sub_county?.trim()) set.add(c.sub_county.trim());
    });
    return Array.from(set).sort();
  }, [centers]);

  const clearFilters = () => {
    setFilterGender("all");
    setFilterStatus("all");
    setFilterCenter("all");
    setFilterSubCounty("all");
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
    const matchesSubCounty =
      filterSubCounty === "all" ||
      (teacher as any).ecde_centers?.sub_county === filterSubCounty;
    const matchesQual =
      filterQualification === "all" || teacher.qualification === filterQualification;
    return matchesSearch && matchesGender && matchesStatus && matchesCenter && matchesSubCounty && matchesQual;
  });

  const filterDefs: FilterDef[] = useMemo(() => [
    {
      key: "gender",
      label: "Gender",
      options: [
        { value: "all", label: "All genders" },
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
      ],
    },
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
    {
      key: "qualification",
      label: "Qualification",
      options: [
        { value: "all", label: "All qualifications" },
        ...qualifications.map((q) => ({ value: q, label: q })),
      ],
    },
    {
      key: "subCounty",
      label: "Sub-county",
      options: [
        { value: "all", label: "All sub-counties" },
        ...subCounties.map((s) => ({ value: s, label: s })),
      ],
      primary: false,
    },
    {
      key: "center",
      label: "Center",
      options: [
        { value: "all", label: "All centers" },
        { value: "unassigned", label: "Unassigned" },
        ...((centers || []).map((c) => ({ value: c.id, label: c.name }))),
      ],
      primary: false,
    },
  ], [centers, subCounties, qualifications]);

  const filterValues = {
    gender: filterGender,
    status: filterStatus,
    qualification: filterQualification,
    subCounty: filterSubCounty,
    center: filterCenter,
  };

  const handleFilterChange = (key: string, value: string) => {
    switch (key) {
      case "gender": setFilterGender(value); break;
      case "status": setFilterStatus(value); break;
      case "qualification": setFilterQualification(value); break;
      case "subCounty": setFilterSubCounty(value); break;
      case "center": setFilterCenter(value); break;
    }
  };


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

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Name, employee no, phone, email…"
        filters={filterDefs}
        values={filterValues}
        onChange={handleFilterChange}
        onClear={clearFilters}
      />

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
