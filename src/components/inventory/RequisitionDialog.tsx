import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { useCreateRequisition, type InventoryCategory } from "@/hooks/useInventory";

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

export function RequisitionDialog({ open, onOpenChange, items }: Props) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<any[]>([{ item_name: "", category: "food", quantity: 1, unit: "pcs", item_id: null }]);
  const create = useCreateRequisition();

  const addLine = () => setLines([...lines, { item_name: "", category: "food", quantity: 1, unit: "pcs", item_id: null }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: any) => setLines(lines.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const submit = async () => {
    const valid = lines.filter(l => l.item_name && Number(l.quantity) > 0);
    if (valid.length === 0) return;
    await create.mutateAsync({
      reason, notes,
      items: valid.map(l => ({ item_name: l.item_name, category: l.category, quantity: Number(l.quantity), unit: l.unit, item_id: l.item_id || null })),
    });
    setLines([{ item_name: "", category: "food", quantity: 1, unit: "pcs", item_id: null }]);
    setReason(""); setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Requisition</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Reason *</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Term restock, urgent need..." />
          </div>
          <div>
            <Label>Items</Label>
            <div className="space-y-2">
              {lines.map((l, i) => {
                const selected = items.find(x => x.id === l.item_id);
                const available = selected ? Number(selected.current_quantity) : null;
                const requested = Number(l.quantity) || 0;
                const insufficient = available !== null && requested > available;
                return (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 border rounded">
                  <div className="col-span-4">
                    <Label className="text-xs">Item</Label>
                    <Select value={l.item_id ?? "custom"} onValueChange={v => {
                      if (v === "custom") updateLine(i, { item_id: null });
                      else {
                        const it = items.find(x => x.id === v);
                        updateLine(i, { item_id: v, item_name: it?.name ?? "", category: it?.category ?? "other", unit: it?.unit ?? "pcs" });
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select or custom" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">— Custom item —</SelectItem>
                        {items.map(it => (
                          <SelectItem key={it.id} value={it.id}>
                            {it.name} {it.center_id == null ? "🏛️" : ""} ({Number(it.current_quantity)} {it.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selected && (
                      <p className={`text-[11px] mt-1 ${insufficient ? "text-destructive" : "text-muted-foreground"}`}>
                        Available: {available} {selected.unit} {insufficient && "• exceeds available stock"}
                      </p>
                    )}
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Name</Label>
                    <Input value={l.item_name} onChange={e => updateLine(i, { item_name: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Category</Label>
                    <Select value={l.category} onValueChange={v => updateLine(i, { category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" value={l.quantity} onChange={e => updateLine(i, { quantity: e.target.value })} />
                  </div>
                  <div className="col-span-1">
                    <Button variant="ghost" size="sm" onClick={() => removeLine(i)} disabled={lines.length === 1}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                );
              })}
            </div>
            <Button variant="outline" size="sm" onClick={addLine} className="mt-2"><Plus className="w-4 h-4 mr-1" />Add line</Button>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!reason}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
