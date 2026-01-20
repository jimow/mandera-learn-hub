import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useCenters } from "@/hooks/useCenters";
import { useCreateTeacherTransfer } from "@/hooks/useTeacherTransfers";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Teacher = Database["public"]["Tables"]["teachers"]["Row"];

const formSchema = z.object({
  to_center_id: z.string().min(1, "Please select a destination center"),
  transfer_date: z.string().min(1, "Please select a transfer date"),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TeacherTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher | null;
}

export function TeacherTransferDialog({ open, onOpenChange, teacher }: TeacherTransferDialogProps) {
  const { data: centers } = useCenters();
  const createTransfer = useCreateTeacherTransfer();
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      to_center_id: "",
      transfer_date: new Date().toISOString().split("T")[0],
      reason: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        to_center_id: "",
        transfer_date: new Date().toISOString().split("T")[0],
        reason: "",
        notes: "",
      });
    }
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!teacher) return;

    await createTransfer.mutateAsync({
      teacher_id: teacher.id,
      from_center_id: teacher.center_id,
      to_center_id: values.to_center_id,
      transfer_date: values.transfer_date,
      reason: values.reason || null,
      notes: values.notes || null,
      transferred_by: user?.id,
      status: "completed",
    });

    onOpenChange(false);
  };

  // Filter out the current center from available options
  const availableCenters = centers?.filter(c => c.id !== teacher?.center_id) || [];
  const currentCenter = centers?.find(c => c.id === teacher?.center_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transfer Teacher</DialogTitle>
          <DialogDescription>
            Transfer {teacher?.full_name} to a new ECDE center.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-muted-foreground">Current Center</p>
              <p className="font-medium">{currentCenter?.name || "Unassigned"}</p>
            </div>

            <FormField
              control={form.control}
              name="to_center_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Center *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new center" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transfer_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Transfer</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Staffing needs, personal request, etc."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTransfer.isPending}>
                {createTransfer.isPending ? "Transferring..." : "Transfer Teacher"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
