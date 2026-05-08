import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSupplier } from "@/hooks/useInventory";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function SupplierDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState({ name: "", contact_person: "", phone: "", email: "", address: "" });
  const create = useCreateSupplier();

  const submit = async () => {
    await create.mutateAsync(form);
    setForm({ name: "", contact_person: "", phone: "", email: "", address: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Contact Person</Label>
            <Input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!form.name}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
