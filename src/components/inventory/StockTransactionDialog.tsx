import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateStockTransaction } from "@/hooks/useInventory";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: any;
  mode: "stock_in" | "stock_out";
  suppliers: any[];
}

export function StockTransactionDialog({ open, onOpenChange, item, mode, suppliers }: Props) {
  const [form, setForm] = useState<any>({
    quantity: 1, reason: "", reference_number: "", supplier_id: null,
    transaction_date: new Date().toISOString().slice(0, 10), notes: "", unit_cost: 0,
  });
  const create = useCreateStockTransaction();

  useEffect(() => {
    if (open) setForm({ quantity: 1, reason: "", reference_number: "", supplier_id: null, transaction_date: new Date().toISOString().slice(0, 10), notes: "", unit_cost: item?.unit_cost ?? 0 });
  }, [open, item]);

  const submit = async () => {
    if (!item) return;
    await create.mutateAsync({
      item_id: item.id,
      center_id: item.center_id,
      transaction_type: mode,
      quantity: Number(form.quantity),
      unit_cost: Number(form.unit_cost),
      reason: form.reason,
      reference_number: form.reference_number,
      supplier_id: form.supplier_id || null,
      transaction_date: form.transaction_date,
      notes: form.notes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "stock_in" ? "Stock In" : "Stock Out / Distribute"}: {item?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Current: {item?.current_quantity} {item?.unit}</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity *</Label>
              <Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} />
            </div>
          </div>
          {mode === "stock_in" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Unit Cost</Label>
                  <Input type="number" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} />
                </div>
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
              </div>
              <div>
                <Label>Reference / Invoice #</Label>
                <Input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} />
              </div>
            </>
          )}
          <div>
            <Label>Reason</Label>
            <Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder={mode === "stock_in" ? "Delivery, donation..." : "Daily ration, classroom use..."} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
