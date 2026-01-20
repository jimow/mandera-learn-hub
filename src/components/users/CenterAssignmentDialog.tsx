import { useState } from "react";
import { School, X, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserCenterAssignments, useAssignCenter, useRemoveCenterAssignment } from "@/hooks/useUserCenterAssignment";
import { useCenters } from "@/hooks/useCenters";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

interface CenterAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { userId: string; fullName: string } | null;
}

export function CenterAssignmentDialog({ open, onOpenChange, user }: CenterAssignmentDialogProps) {
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState<{ id: string; centerName: string } | null>(null);

  const { data: assignments, isLoading: assignmentsLoading } = useUserCenterAssignments(user?.userId || "");
  const { data: centers, isLoading: centersLoading } = useCenters();
  const assignCenter = useAssignCenter();
  const removeAssignment = useRemoveCenterAssignment();

  const activeAssignments = assignments?.filter(a => a.is_active) || [];
  const assignedCenterIds = activeAssignments.map(a => a.center_id);
  const availableCenters = centers?.filter(c => !assignedCenterIds.includes(c.id)) || [];

  const handleAssignCenter = async () => {
    if (user && selectedCenterId) {
      await assignCenter.mutateAsync({ userId: user.userId, centerId: selectedCenterId });
      setSelectedCenterId("");
    }
  };

  const handleRemoveClick = (assignmentId: string, centerName: string) => {
    setAssignmentToRemove({ id: assignmentId, centerName });
    setConfirmRemoveOpen(true);
  };

  const confirmRemove = async () => {
    if (assignmentToRemove && user) {
      await removeAssignment.mutateAsync({ 
        assignmentId: assignmentToRemove.id, 
        userId: user.userId 
      });
      setConfirmRemoveOpen(false);
      setAssignmentToRemove(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <School className="w-5 h-5 text-primary" />
              Manage Centers for {user?.fullName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current Assignments */}
            <div>
              <h4 className="text-sm font-medium mb-3">Assigned Centers</h4>
              {assignmentsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : activeAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No centers assigned</p>
              ) : (
                <div className="space-y-2">
                  {activeAssignments.map((assignment) => (
                    <div 
                      key={assignment.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <School className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{assignment.ecde_centers?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Code: {assignment.ecde_centers?.code}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveClick(assignment.id, assignment.ecde_centers?.name || "")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Center */}
            {availableCenters.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">Assign New Center</h4>
                <div className="flex gap-2">
                  <Select value={selectedCenterId} onValueChange={setSelectedCenterId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a center" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">{center.code}</Badge>
                            {center.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssignCenter}
                    disabled={!selectedCenterId || assignCenter.isPending}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    {assignCenter.isPending ? "Adding..." : "Assign"}
                  </Button>
                </div>
              </div>
            )}

            {availableCenters.length === 0 && !centersLoading && (
              <p className="text-sm text-muted-foreground text-center py-2">
                All centers have been assigned to this user.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        onConfirm={confirmRemove}
        title="Remove Center Assignment"
        description={`Are you sure you want to remove "${assignmentToRemove?.centerName}" from ${user?.fullName}?`}
        isLoading={removeAssignment.isPending}
      />
    </>
  );
}
