import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateUtilizationLog } from "@/hooks/useInventory";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: any[];
  preselectedItem?: any;
}

export function UtilizationLogDialog({ open, onOpenChange, items, preselectedItem }: Props) {
  const [form, setForm] = useState<any>({
    item_id: "", quantity: 1,
    utilization_date: new Date().toISOString().slice(0, 10),
    purpose: "", beneficiaries: "", class_level: "none", notes: "",
  });
  const create = useCreateUtilizationLog();

  useEffect(() => {
    if (open) setForm({
      item_id: preselectedItem?.id ?? "",
      quantity: 1,
      utilization_date: new Date().toISOString().slice(0, 10),
      purpose: "", beneficiaries: "", class_level: "none", notes: "",
    });
  }, [open, preselectedItem]);

  const selectedItem = items.find(i => i.id === form.item_id);

  const submit = async () => {
    await create.mutateAsync({
      item_id: form.item_id,
      quantity: Number(form.quantity),
      utilization_date: form.utilization_date,
      purpose: form.purpose,
      beneficiaries: form.beneficiaries ? Number(form.beneficiaries) : undefined,
      class_level: form.class_level === "none" ? null : form.class_level,
      notes: form.notes,
      center_id: selectedItem?.center_id,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Record Utilization / Distribution</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Item *</Label>
            <Select value={form.item_id} onValueChange={v => setForm({ ...form, item_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger>
              <SelectContent>
                {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.current_quantity} {i.unit})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity Used *</Label>
              <Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
              {selectedItem && <p className="text-xs text-muted-foreground mt-1">Available: {selectedItem.current_quantity} {selectedItem.unit}</p>}
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.utilization_date} onChange={e => setForm({ ...form, utilization_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Beneficiaries (#)</Label>
              <Input type="number" value={form.beneficiaries} onChange={e => setForm({ ...form, beneficiaries: e.target.value })} />
            </div>
            <div>
              <Label>Class Level</Label>
              <Select value={form.class_level} onValueChange={v => setForm({ ...form, class_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All / N/A</SelectItem>
                  <SelectItem value="pp1">PP1</SelectItem>
                  <SelectItem value="pp2">PP2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Purpose</Label>
            <Input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Lunch ration, classroom activity" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!form.item_id || !form.quantity}>Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
