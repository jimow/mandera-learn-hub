import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateInventoryItem, useUpdateInventoryItem, type InventoryCategory } from "@/hooks/useInventory";

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
  item?: any;
  suppliers: any[];
}

export function InventoryItemDialog({ open, onOpenChange, item, suppliers }: Props) {
  const [form, setForm] = useState<any>({
    name: "", category: "food", unit: "pcs", current_quantity: 0, reorder_level: 0,
    unit_cost: 0, description: "", sku: "", supplier_id: null, expiry_date: null,
  });

  const create = useCreateInventoryItem();
  const update = useUpdateInventoryItem();

  useEffect(() => {
    if (item) setForm({ ...item, supplier_id: item.supplier_id ?? null, expiry_date: item.expiry_date ?? null });
    else setForm({ name: "", category: "food", unit: "pcs", current_quantity: 0, reorder_level: 0, unit_cost: 0, description: "", sku: "", supplier_id: null, expiry_date: null });
  }, [item, open]);

  const submit = async () => {
    const payload = {
      ...form,
      current_quantity: Number(form.current_quantity),
      reorder_level: Number(form.reorder_level),
      unit_cost: Number(form.unit_cost),
      supplier_id: form.supplier_id || null,
      expiry_date: form.expiry_date || null,
    };
    if (item?.id) await update.mutateAsync({ id: item.id, ...payload });
    else await create.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item?.id ? "Edit" : "Add"} Inventory Item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit *</Label>
              <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="pcs, kg, liters..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Current Quantity</Label>
              <Input type="number" value={form.current_quantity} onChange={e => setForm({ ...form, current_quantity: e.target.value })} />
            </div>
            <div>
              <Label>Reorder Level</Label>
              <Input type="number" value={form.reorder_level} onChange={e => setForm({ ...form, reorder_level: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit Cost (KES)</Label>
              <Input type="number" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} />
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={form.sku ?? ""} onChange={e => setForm({ ...form, sku: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Supplier</Label>
              <Select value={form.supplier_id ?? "none"} onValueChange={v => setForm({ ...form, supplier_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiry_date ?? ""} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!form.name}>{item?.id ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
