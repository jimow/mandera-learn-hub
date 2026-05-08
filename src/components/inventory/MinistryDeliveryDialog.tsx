import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateMinistryDelivery, type InventoryCategory } from "@/hooks/useInventory";

const CATS: { value: InventoryCategory; label: string }[] = [
  { value: "food", label: "Food Rations" },
  { value: "learning_material", label: "Learning Materials" },
  { value: "book", label: "Books" },
  { value: "furniture", label: "Furniture" },
  { value: "equipment", label: "Equipment" },
  { value: "stationery", label: "Stationery" },
  { value: "other", label: "Other" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: any[];
}

export function MinistryDeliveryDialog({ open, onOpenChange, items }: Props) {
  const [form, setForm] = useState<any>({
    item_id: "none", item_name: "", category: "food", quantity: 1, unit: "pcs",
    delivery_date: new Date().toISOString().slice(0, 10),
    delivered_by: "", reference_number: "", notes: "",
  });
  const create = useCreateMinistryDelivery();

  useEffect(() => {
    if (open) setForm({ item_id: "none", item_name: "", category: "food", quantity: 1, unit: "pcs", delivery_date: new Date().toISOString().slice(0, 10), delivered_by: "", reference_number: "", notes: "" });
  }, [open]);

  const onItemChange = (v: string) => {
    if (v === "none") {
      setForm({ ...form, item_id: "none" });
    } else {
      const it = items.find(i => i.id === v);
      setForm({ ...form, item_id: v, item_name: it?.name ?? "", category: it?.category ?? form.category, unit: it?.unit ?? form.unit });
    }
  };

  const submit = async () => {
    await create.mutateAsync({
      item_id: form.item_id === "none" ? null : form.item_id,
      item_name: form.item_name,
      category: form.category,
      quantity: Number(form.quantity),
      unit: form.unit,
      delivery_date: form.delivery_date,
      delivered_by: form.delivered_by,
      reference_number: form.reference_number,
      notes: form.notes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Record Ministry Delivery</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Existing Item (auto-adds to stock)</Label>
            <Select value={form.item_id} onValueChange={onItemChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— New / Untracked Item —</SelectItem>
                {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Item Name *</Label>
            <Input value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity *</Label>
              <Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <Label>Delivery Date</Label>
              <Input type="date" value={form.delivery_date} onChange={e => setForm({ ...form, delivery_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Delivered By</Label>
              <Input value={form.delivered_by} onChange={e => setForm({ ...form, delivered_by: e.target.value })} placeholder="Officer name" />
            </div>
            <div>
              <Label>Reference / GRN #</Label>
              <Input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!form.item_name || !form.quantity}>Record Delivery</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
