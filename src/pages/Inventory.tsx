import { useState, useMemo } from "react";
import { Plus, Search, Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ClipboardList, Truck, Apple, BookOpen, Armchair, PenTool, Wrench, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useInventoryItems, useStockTransactions, useRequisitions, useSuppliers,
  useDeleteInventoryItem, useUpdateRequisitionStatus,
  type InventoryCategory,
} from "@/hooks/useInventory";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCenterAssignment } from "@/hooks/useUserCenterAssignment";
import { InventoryItemDialog } from "@/components/inventory/InventoryItemDialog";
import { StockTransactionDialog } from "@/components/inventory/StockTransactionDialog";
import { RequisitionDialog } from "@/components/inventory/RequisitionDialog";
import { SupplierDialog } from "@/components/inventory/SupplierDialog";
import { format } from "date-fns";

const CATEGORY_META: Record<InventoryCategory, { label: string; icon: any; color: string }> = {
  food: { label: "Food Rations", icon: Apple, color: "bg-orange-500/10 text-orange-600" },
  learning_material: { label: "Learning Materials", icon: PenTool, color: "bg-blue-500/10 text-blue-600" },
  book: { label: "Books", icon: BookOpen, color: "bg-purple-500/10 text-purple-600" },
  furniture: { label: "Furniture", icon: Armchair, color: "bg-amber-500/10 text-amber-700" },
  equipment: { label: "Equipment", icon: Wrench, color: "bg-slate-500/10 text-slate-600" },
  stationery: { label: "Stationery", icon: PenTool, color: "bg-green-500/10 text-green-600" },
  other: { label: "Other", icon: Package, color: "bg-muted text-muted-foreground" },
};

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockMode, setStockMode] = useState<"stock_in" | "stock_out">("stock_in");
  const [stockItem, setStockItem] = useState<any>(null);
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

  const { hasRole, isAdmin } = useAuth();
  const { data: assignment } = useUserCenterAssignment();
  const isCenterAdmin = hasRole("center_admin");
  const canManage = isAdmin() || isCenterAdmin;

  const { data: items = [], isLoading } = useInventoryItems();
  const { data: transactions = [] } = useStockTransactions();
  const { data: requisitions = [] } = useRequisitions();
  const { data: suppliers = [] } = useSuppliers();
  const deleteItem = useDeleteInventoryItem();
  const updateReqStatus = useUpdateRequisitionStatus();

  const filteredItems = useMemo(() => items.filter((it: any) => {
    const matchSearch = it.name.toLowerCase().includes(search.toLowerCase()) || (it.sku ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || it.category === categoryFilter;
    return matchSearch && matchCat;
  }), [items, search, categoryFilter]);

  const stats = useMemo(() => {
    const lowStock = items.filter((i: any) => Number(i.current_quantity) <= Number(i.reorder_level));
    const totalValue = items.reduce((s: number, i: any) => s + Number(i.current_quantity) * Number(i.unit_cost ?? 0), 0);
    const expiringSoon = items.filter((i: any) => {
      if (!i.expiry_date) return false;
      const days = (new Date(i.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days <= 30 && days >= 0;
    });
    return { total: items.length, lowStock: lowStock.length, totalValue, expiringSoon: expiringSoon.length };
  }, [items]);

  const handleStockIn = (item: any) => { setStockItem(item); setStockMode("stock_in"); setStockDialogOpen(true); };
  const handleStockOut = (item: any) => { setStockItem(item); setStockMode("stock_out"); setStockDialogOpen(true); };
  const handleEdit = (item: any) => { setEditingItem(item); setItemDialogOpen(true); };

  if (!isAdmin() && isCenterAdmin && !assignment?.center_id) {
    return (
      <div className="p-8 text-center">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Center Assigned</h2>
        <p className="text-muted-foreground">You need to be assigned to a center to manage inventory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Store & Inventory</h1>
          <p className="text-muted-foreground text-sm">Manage food rations, books, materials, furniture and equipment</p>
        </div>
        {canManage && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setSupplierDialogOpen(true)}>
              <Truck className="w-4 h-4 mr-2" />Suppliers
            </Button>
            <Button variant="outline" onClick={() => setReqDialogOpen(true)}>
              <ClipboardList className="w-4 h-4 mr-2" />New Requisition
            </Button>
            <Button onClick={() => { setEditingItem(null); setItemDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />Add Item
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-destructive">{stats.lowStock}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-xs text-muted-foreground">Expiring (30d)</p>
            <p className="text-2xl font-bold text-warning">{stats.expiringSoon}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-xs text-muted-foreground">Stock Value (KES)</p>
            <p className="text-2xl font-bold">{stats.totalValue.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (<TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>)}
                {!isLoading && filteredItems.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No items found. Add your first item to get started.</TableCell></TableRow>
                )}
                {filteredItems.map((it: any) => {
                  const meta = CATEGORY_META[it.category as InventoryCategory];
                  const Icon = meta.icon;
                  const low = Number(it.current_quantity) <= Number(it.reorder_level);
                  return (
                    <TableRow key={it.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}><Icon className="w-4 h-4" /></div>
                          <div>
                            <p className="font-medium">{it.name}</p>
                            {it.sku && <p className="text-xs text-muted-foreground">SKU: {it.sku}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{meta.label}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{Number(it.current_quantity)} {it.unit}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{Number(it.reorder_level)}</TableCell>
                      <TableCell>
                        {low ? <Badge variant="destructive">Low Stock</Badge> : <Badge variant="secondary">OK</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{it.expiry_date ? format(new Date(it.expiry_date), "PP") : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canManage && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleStockIn(it)} title="Stock In"><ArrowDownToLine className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleStockOut(it)} title="Stock Out"><ArrowUpFromLine className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(it)}><Edit className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteItem.mutate(it.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions yet.</TableCell></TableRow>)}
                {transactions.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>{format(new Date(t.transaction_date), "PP")}</TableCell>
                    <TableCell>{t.inventory_items?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.transaction_type === "stock_in" ? "default" : t.transaction_type === "stock_out" || t.transaction_type === "distribution" ? "secondary" : "outline"}>
                        {t.transaction_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{Number(t.quantity)} {t.inventory_items?.unit}</TableCell>
                    <TableCell className="text-sm">{t.reason ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.reference_number ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="requisitions">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin() && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisitions.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No requisitions.</TableCell></TableRow>)}
                {requisitions.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{format(new Date(r.created_at), "PP")}</TableCell>
                    <TableCell>{r.ecde_centers?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{r.requisition_items?.length ?? 0} items</TableCell>
                    <TableCell className="text-sm">{r.reason ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "approved" || r.status === "fulfilled" ? "default" : r.status === "rejected" || r.status === "cancelled" ? "destructive" : "secondary"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    {isAdmin() && (
                      <TableCell className="text-right">
                        {r.status === "pending" && (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" onClick={() => updateReqStatus.mutate({ id: r.id, status: "approved" })}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => updateReqStatus.mutate({ id: r.id, status: "rejected" })}>Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No suppliers added.</TableCell></TableRow>)}
                {suppliers.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.contact_person ?? "—"}</TableCell>
                    <TableCell>{s.phone ?? "—"}</TableCell>
                    <TableCell>{s.email ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <InventoryItemDialog
        open={itemDialogOpen}
        onOpenChange={(o) => { setItemDialogOpen(o); if (!o) setEditingItem(null); }}
        item={editingItem}
        suppliers={suppliers}
      />
      <StockTransactionDialog
        open={stockDialogOpen}
        onOpenChange={setStockDialogOpen}
        item={stockItem}
        mode={stockMode}
        suppliers={suppliers}
      />
      <RequisitionDialog
        open={reqDialogOpen}
        onOpenChange={setReqDialogOpen}
        items={items}
      />
      <SupplierDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
      />
    </div>
  );
}
