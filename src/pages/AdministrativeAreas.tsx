import { useState } from "react";
import { Plus, Search, Edit, Trash2, MapPin, Building, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { CountyDialog } from "@/components/administrative/CountyDialog";
import { SubCountyDialog } from "@/components/administrative/SubCountyDialog";
import { WardDialog } from "@/components/administrative/WardDialog";
import { useCounties, useDeleteCounty } from "@/hooks/useCounties";
import { useSubCountiesWithCounty, useDeleteSubCounty } from "@/hooks/useSubCountiesManagement";
import { useWardsWithSubCounty, useDeleteWard } from "@/hooks/useWardsManagement";
import { useAuth } from "@/contexts/AuthContext";

export default function AdministrativeAreas() {
  const [activeTab, setActiveTab] = useState("counties");
  const [searchQuery, setSearchQuery] = useState("");
  
  // County state
  const [countyDialogOpen, setCountyDialogOpen] = useState(false);
  const [editingCounty, setEditingCounty] = useState<any>(null);
  const [deleteCountyOpen, setDeleteCountyOpen] = useState(false);
  const [countyToDelete, setCountyToDelete] = useState<any>(null);
  
  // Sub-County state
  const [subCountyDialogOpen, setSubCountyDialogOpen] = useState(false);
  const [editingSubCounty, setEditingSubCounty] = useState<any>(null);
  const [deleteSubCountyOpen, setDeleteSubCountyOpen] = useState(false);
  const [subCountyToDelete, setSubCountyToDelete] = useState<any>(null);
  
  // Ward state
  const [wardDialogOpen, setWardDialogOpen] = useState(false);
  const [editingWard, setEditingWard] = useState<any>(null);
  const [deleteWardOpen, setDeleteWardOpen] = useState(false);
  const [wardToDelete, setWardToDelete] = useState<any>(null);

  const { data: counties, isLoading: countiesLoading } = useCounties();
  const { data: subCounties, isLoading: subCountiesLoading } = useSubCountiesWithCounty();
  const { data: wards, isLoading: wardsLoading } = useWardsWithSubCounty();
  
  const deleteCounty = useDeleteCounty();
  const deleteSubCounty = useDeleteSubCounty();
  const deleteWard = useDeleteWard();
  
  const { isAdmin } = useAuth();
  const canManage = isAdmin();

  // Filter data based on search
  const filteredCounties = counties?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredSubCounties = subCounties?.filter(sc => 
    sc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sc.counties?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredWards = wards?.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.sub_counties?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Administrative Areas</h1>
          <p className="page-description">Manage counties, sub-counties, and wards</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="counties" className="gap-2">
              <Building className="w-4 h-4" />
              Counties
            </TabsTrigger>
            <TabsTrigger value="subcounties" className="gap-2">
              <MapPin className="w-4 h-4" />
              Sub-Counties
            </TabsTrigger>
            <TabsTrigger value="wards" className="gap-2">
              <Map className="w-4 h-4" />
              Wards
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-10 w-64" 
              />
            </div>
            {canManage && (
              <Button 
                onClick={() => {
                  if (activeTab === "counties") {
                    setEditingCounty(null);
                    setCountyDialogOpen(true);
                  } else if (activeTab === "subcounties") {
                    setEditingSubCounty(null);
                    setSubCountyDialogOpen(true);
                  } else {
                    setEditingWard(null);
                    setWardDialogOpen(true);
                  }
                }} 
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add {activeTab === "counties" ? "County" : activeTab === "subcounties" ? "Sub-County" : "Ward"}
              </Button>
            )}
          </div>
        </div>

        {/* Counties Tab */}
        <TabsContent value="counties" className="mt-6">
          {countiesLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredCounties.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No counties found</div>
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Sub-Counties</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCounties.map((county) => {
                    const subCountyCount = subCounties?.filter(sc => sc.county_id === county.id).length || 0;
                    return (
                      <TableRow key={county.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{county.code}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{county.name}</TableCell>
                        <TableCell>{subCountyCount}</TableCell>
                        <TableCell className="text-right">
                          {canManage && (
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => { setEditingCounty(county); setCountyDialogOpen(true); }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => { setCountyToDelete(county); setDeleteCountyOpen(true); }}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Sub-Counties Tab */}
        <TabsContent value="subcounties" className="mt-6">
          {subCountiesLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredSubCounties.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No sub-counties found</div>
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>County</TableHead>
                    <TableHead>Wards</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubCounties.map((subCounty) => {
                    const wardCount = wards?.filter(w => w.sub_county_id === subCounty.id).length || 0;
                    return (
                      <TableRow key={subCounty.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{subCounty.code}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{subCounty.name}</TableCell>
                        <TableCell>{subCounty.counties?.name || "-"}</TableCell>
                        <TableCell>{wardCount}</TableCell>
                        <TableCell className="text-right">
                          {canManage && (
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => { setEditingSubCounty(subCounty); setSubCountyDialogOpen(true); }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => { setSubCountyToDelete(subCounty); setDeleteSubCountyOpen(true); }}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Wards Tab */}
        <TabsContent value="wards" className="mt-6">
          {wardsLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredWards.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No wards found</div>
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Sub-County</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWards.map((ward) => (
                    <TableRow key={ward.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{ward.code}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{ward.name}</TableCell>
                      <TableCell>{ward.sub_counties?.name || "-"}</TableCell>
                      <TableCell className="text-right">
                        {canManage && (
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => { setEditingWard(ward); setWardDialogOpen(true); }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => { setWardToDelete(ward); setDeleteWardOpen(true); }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CountyDialog 
        open={countyDialogOpen} 
        onOpenChange={setCountyDialogOpen} 
        county={editingCounty} 
      />
      <SubCountyDialog 
        open={subCountyDialogOpen} 
        onOpenChange={setSubCountyDialogOpen} 
        subCounty={editingSubCounty} 
      />
      <WardDialog 
        open={wardDialogOpen} 
        onOpenChange={setWardDialogOpen} 
        ward={editingWard} 
      />

      {/* Delete Confirmations */}
      <DeleteConfirmDialog
        open={deleteCountyOpen}
        onOpenChange={setDeleteCountyOpen}
        onConfirm={async () => {
          if (countyToDelete) {
            await deleteCounty.mutateAsync(countyToDelete.id);
            setDeleteCountyOpen(false);
            setCountyToDelete(null);
          }
        }}
        title="Delete County"
        description={`Are you sure you want to delete ${countyToDelete?.name}? This will also delete all sub-counties and wards under it.`}
        isLoading={deleteCounty.isPending}
      />
      <DeleteConfirmDialog
        open={deleteSubCountyOpen}
        onOpenChange={setDeleteSubCountyOpen}
        onConfirm={async () => {
          if (subCountyToDelete) {
            await deleteSubCounty.mutateAsync(subCountyToDelete.id);
            setDeleteSubCountyOpen(false);
            setSubCountyToDelete(null);
          }
        }}
        title="Delete Sub-County"
        description={`Are you sure you want to delete ${subCountyToDelete?.name}? This will also delete all wards under it.`}
        isLoading={deleteSubCounty.isPending}
      />
      <DeleteConfirmDialog
        open={deleteWardOpen}
        onOpenChange={setDeleteWardOpen}
        onConfirm={async () => {
          if (wardToDelete) {
            await deleteWard.mutateAsync(wardToDelete.id);
            setDeleteWardOpen(false);
            setWardToDelete(null);
          }
        }}
        title="Delete Ward"
        description={`Are you sure you want to delete ${wardToDelete?.name}?`}
        isLoading={deleteWard.isPending}
      />
    </div>
  );
}
