import { useState } from "react";
import { MapPin, X, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useUserSubCountyAssignments,
  useAssignSubCounty,
  useRemoveSubCountyAssignment,
} from "@/hooks/useUserSubCountyAssignment";
import { useSubCounties } from "@/hooks/useSubCounties";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { userId: string; fullName: string } | null;
}

export function SubCountyAssignmentDialog({ open, onOpenChange, user }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toRemove, setToRemove] = useState<{ id: string; name: string } | null>(null);

  const { data: assignments, isLoading } = useUserSubCountyAssignments(user?.userId || "");
  const { data: subCounties } = useSubCounties();
  const assign = useAssignSubCounty();
  const remove = useRemoveSubCountyAssignment();

  const assignedIds = (assignments || []).map((a) => a.sub_county_id);
  const available = (subCounties || []).filter((s) => !assignedIds.includes(s.id));

  const handleAssign = async () => {
    if (user && selectedId) {
      await assign.mutateAsync({ userId: user.userId, subCountyId: selectedId });
      setSelectedId("");
    }
  };

  const handleRemoveClick = (id: string, name: string) => {
    setToRemove({ id, name });
    setConfirmOpen(true);
  };

  const confirmRemove = async () => {
    if (toRemove && user) {
      await remove.mutateAsync({ assignmentId: toRemove.id, userId: user.userId });
      setConfirmOpen(false);
      setToRemove(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Manage Sub-Counties for {user?.fullName}
            </DialogTitle>
            <DialogDescription>
              Assign one or more sub-counties. The user will only see and manage data within these areas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Assigned Sub-Counties</h4>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : !assignments || assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sub-counties assigned</p>
              ) : (
                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{a.sub_counties?.name}</p>
                          <p className="text-xs text-muted-foreground">Code: {a.sub_counties?.code}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveClick(a.id, a.sub_counties?.name || "")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {available.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium mb-3">Assign New Sub-County</h4>
                <div className="flex gap-2">
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a sub-county" />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((sc) => (
                        <SelectItem key={sc.id} value={sc.id}>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {sc.code}
                            </Badge>
                            {sc.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAssign} disabled={!selectedId || assign.isPending} className="gap-1">
                    <Plus className="w-4 h-4" />
                    {assign.isPending ? "Adding..." : "Assign"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                All sub-counties have been assigned to this user.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={confirmRemove}
        title="Remove Sub-County Assignment"
        description={`Remove "${toRemove?.name}" from ${user?.fullName}?`}
        isLoading={remove.isPending}
      />
    </>
  );
}
