import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, MapPin, Users, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CenterDialog } from "@/components/centers/CenterDialog";
import { CentersMap } from "@/components/dashboard/CentersMap";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { DataActions } from "@/components/shared/DataActions";
import { useCenters, useDeleteCenter } from "@/hooks/useCenters";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Center = Database["public"]["Tables"]["ecde_centers"]["Row"];

export default function Centers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [centerToDelete, setCenterToDelete] = useState<Center | null>(null);

  const { data: centers, isLoading } = useCenters();
  const deleteCenter = useDeleteCenter();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission("centers", "create");
  const canUpdate = hasPermission("centers", "update");
  const canDelete = hasPermission("centers", "delete");

  const filteredCenters = centers?.filter((center) =>
    center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    center.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    center.sub_county.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleEdit = (center: Center) => { setEditingCenter(center); setDialogOpen(true); };
  const handleDelete = (center: Center) => { setCenterToDelete(center); setDeleteDialogOpen(true); };
  const confirmDelete = async () => { if (centerToDelete) { await deleteCenter.mutateAsync(centerToDelete.id); setDeleteDialogOpen(false); setCenterToDelete(null); } };

  const getOccupancyColor = (current: number, capacity: number) => {
    const ratio = current / capacity;
    if (ratio >= 0.9) return "text-destructive";
    if (ratio >= 0.7) return "text-warning";
    return "text-success";
  };

  // Prepare data for export
  const exportData = filteredCenters.map(center => ({
    code: center.code,
    name: center.name,
    location: center.location,
    sub_county: center.sub_county,
    ward: center.ward,
    capacity: center.capacity || 50,
    students_count: (center as any).students_count || 0,
    teachers_count: (center as any).teachers_count || 0,
    contact_phone: center.contact_phone || "",
    contact_email: center.contact_email || "",
    latitude: (center as any).latitude || "",
    longitude: (center as any).longitude || "",
    established_date: center.established_date || "",
    is_active: center.is_active ? "Active" : "Inactive",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">ECDE Centers</h1>
          <p className="page-description">Manage early childhood development education centers</p>
        </div>
        <div className="flex gap-2">
          <DataActions data={exportData} filename="centers" />
          {canCreate && (
            <Button onClick={() => { setEditingCenter(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Center
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search centers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      <CentersMap />
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : filteredCenters.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No centers found</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCenters.map((center) => (
            <div key={center.id} className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">{center.code}</Badge>
                      <Badge variant={center.is_active ? "default" : "secondary"}>{center.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <h3 className="font-display font-semibold text-lg">{center.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />{center.location}, {center.sub_county}
                    </p>
                  </div>
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
                        <DropdownMenuItem className="gap-2" onClick={() => handleEdit(center)}>
                          <Edit className="w-4 h-4" /> Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(center)}>
                          <Trash2 className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="p-6 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <p className={`text-xl font-bold ${getOccupancyColor((center as any).students_count || 0, center.capacity || 50)}`}>
                    {(center as any).students_count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto rounded-lg bg-secondary/10 flex items-center justify-center mb-2">
                    <Users className="w-5 h-5 text-secondary" />
                  </div>
                  <p className="text-xl font-bold">{(center as any).teachers_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Teachers</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                    <span className="text-lg font-bold text-accent">{center.capacity || 50}</span>
                  </div>
                  <p className="text-xl font-bold">
                    {Math.round((((center as any).students_count || 0) / (center.capacity || 50)) * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                </div>
              </div>
              <div className="px-6 pb-6">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min((((center as any).students_count || 0) / (center.capacity || 50)) * 100, 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CenterDialog open={dialogOpen} onOpenChange={setDialogOpen} center={editingCenter} />
      <DeleteConfirmDialog 
        open={deleteDialogOpen} 
        onOpenChange={setDeleteDialogOpen} 
        onConfirm={confirmDelete} 
        title="Delete Center" 
        description={`Are you sure you want to delete ${centerToDelete?.name}? This action cannot be undone.`} 
        isLoading={deleteCenter.isPending} 
      />
    </div>
  );
}
