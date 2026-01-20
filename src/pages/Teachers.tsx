import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, Mail, Phone, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TeacherDialog } from "@/components/teachers/TeacherDialog";
import { TeacherTransferDialog } from "@/components/teachers/TeacherTransferDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { useTeachers, useDeleteTeacher } from "@/hooks/useTeachers";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Teacher = Database["public"]["Tables"]["teachers"]["Row"];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Teachers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [teacherToTransfer, setTeacherToTransfer] = useState<Teacher | null>(null);
  
  const { data: teachers, isLoading } = useTeachers();
  const deleteTeacher = useDeleteTeacher();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission("teachers", "create");
  const canUpdate = hasPermission("teachers", "update");
  const canDelete = hasPermission("teachers", "delete");
  const canTransfer = hasPermission("teachers", "transfer");

  const filteredTeachers = teachers?.filter((teacher) =>
    teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.employee_number.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Teachers</h1>
          <p className="page-description">Manage ECDE teachers and their assignments</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setEditingTeacher(null); setDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Teacher
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search teachers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline" className="gap-2"><Filter className="w-4 h-4" />Filters</Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : filteredTeachers.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No teachers found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <div key={teacher.id} className="bg-card rounded-xl border border-border p-6 animate-fade-in hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground font-medium">{getInitials(teacher.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{teacher.full_name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{teacher.employee_number}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2"><Eye className="w-4 h-4" /> View Profile</DropdownMenuItem>
                    {canUpdate && <DropdownMenuItem className="gap-2" onClick={() => handleEdit(teacher)}><Edit className="w-4 h-4" /> Edit</DropdownMenuItem>}
                    {canTransfer && <DropdownMenuItem className="gap-2" onClick={() => handleTransfer(teacher)}><ArrowRightLeft className="w-4 h-4" /> Transfer</DropdownMenuItem>}
                    {canDelete && <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(teacher)}><Trash2 className="w-4 h-4" /> Delete</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-3">
                <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Assigned Center</p><p className="text-sm font-medium">{teacher.ecde_centers?.name || "Unassigned"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Qualification</p><p className="text-sm">{teacher.qualification || "N/A"}</p></div>
                {teacher.phone && <div className="flex items-center gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Phone className="w-3 h-3" />{teacher.phone}</span></div>}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <Badge variant={teacher.is_active ? "default" : "secondary"}>{teacher.is_active ? "Active" : "Inactive"}</Badge>
                {teacher.email && <Button variant="ghost" size="sm" className="gap-1 text-primary"><Mail className="w-3 h-3" />Contact</Button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <TeacherDialog open={dialogOpen} onOpenChange={setDialogOpen} teacher={editingTeacher} />
      <TeacherTransferDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen} teacher={teacherToTransfer} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Delete Teacher" description={`Are you sure you want to delete ${teacherToDelete?.full_name}? This action cannot be undone.`} isLoading={deleteTeacher.isPending} />
    </div>
  );
}
