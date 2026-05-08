import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  FileText, Users, GraduationCap, School, Package, Truck, Activity,
  ClipboardCheck, FileSpreadsheet, TrendingUp, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DataActions } from "@/components/shared/DataActions";
import { StatCard } from "@/components/dashboard/StatCard";
import { useStudents } from "@/hooks/useStudents";
import { useTeachers } from "@/hooks/useTeachers";
import { useCenters } from "@/hooks/useCenters";
import {
  useInventoryItems, useStockTransactions, useMinistryDeliveries,
  useUtilizationLogs, useRequisitions,
} from "@/hooks/useInventory";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--destructive))"];

function inDateRange(dateStr: string | null | undefined, from?: string, to?: string) {
  if (!dateStr) return true;
  const d = new Date(dateStr).getTime();
  if (from && d < new Date(from).getTime()) return false;
  if (to && d > new Date(to).getTime() + 86400000) return false;
  return true;
}

export default function Reports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: students = [] } = useStudents();
  const { data: teachers = [] } = useTeachers();
  const { data: centers = [] } = useCenters();
  const { data: items = [] } = useInventoryItems();
  const { data: stockTx = [] } = useStockTransactions();
  const { data: deliveries = [] } = useMinistryDeliveries();
  const { data: utilization = [] } = useUtilizationLogs();
  const { data: requisitions = [] } = useRequisitions();

  // Filter by date range where applicable
  const fStudents = useMemo(() => students.filter(s => inDateRange(s.created_at, from, to)), [students, from, to]);
  const fDeliveries = useMemo(() => deliveries.filter(d => inDateRange(d.delivery_date, from, to)), [deliveries, from, to]);
  const fUtilization = useMemo(() => utilization.filter(u => inDateRange(u.utilization_date, from, to)), [utilization, from, to]);
  const fRequisitions = useMemo(() => requisitions.filter(r => inDateRange(r.created_at, from, to)), [requisitions, from, to]);

  // Approval breakdown
  const approvalCounts = useMemo(() => {
    const map: Record<string, number> = { pending: 0, approved_subcounty: 0, approved_ministry: 0, rejected: 0 };
    fStudents.forEach(s => {
      const k = (s as any).approval_status || "pending";
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [fStudents]);

  // Inventory by category
  const inventoryByCategory = useMemo(() => {
    const map = new Map<string, { qty: number; value: number; items: number }>();
    items.forEach(i => {
      const cur = map.get(i.category) || { qty: 0, value: 0, items: 0 };
      cur.qty += Number(i.current_quantity) || 0;
      cur.value += (Number(i.current_quantity) || 0) * (Number(i.unit_cost) || 0);
      cur.items += 1;
      map.set(i.category, cur);
    });
    return Array.from(map.entries()).map(([category, v]) => ({ category, ...v }));
  }, [items]);

  // Low stock
  const lowStock = items.filter(i => Number(i.current_quantity) <= Number(i.reorder_level));

  // Deliveries totals
  const totalDeliveredQty = fDeliveries.reduce((s, d) => s + Number(d.quantity || 0), 0);
  const totalUtilizedQty = fUtilization.reduce((s, u) => s + Number(u.quantity || 0), 0);
  const totalBeneficiaries = fUtilization.reduce((s, u) => s + Number(u.beneficiaries || 0), 0);

  // Center performance summary
  const centerStats = useMemo(() => {
    return centers.map(c => {
      const cs = students.filter(s => s.center_id === c.id);
      const ct = teachers.filter(t => t.center_id === c.id);
      const ratio = ct.length ? (cs.length / ct.length).toFixed(1) : "—";
      return {
        name: c.name,
        sub_county: c.sub_county,
        ward: c.ward,
        students: cs.length,
        teachers: ct.length,
        capacity: c.capacity || 50,
        enrollment_rate: `${Math.round((cs.length / ((c.capacity || 50))) * 100)}%`,
        student_teacher_ratio: ratio,
      };
    });
  }, [centers, students, teachers]);

  // Flattened tables for export
  const studentsExport = useMemo(() => fStudents.map(s => ({
    admission_number: s.admission_number, full_name: s.full_name, gender: s.gender,
    date_of_birth: s.date_of_birth, class_level: (s as any).class_level || "",
    parent_name: s.parent_name, parent_phone: s.parent_phone,
    center: s.ecde_centers?.name || "", sub_county: s.ecde_centers?.sub_county || "",
    ward: s.ecde_centers?.ward || "", approval_status: (s as any).approval_status,
    is_active: s.is_active, admission_date: s.admission_date,
  })), [fStudents]);

  const teachersExport = useMemo(() => teachers.map(t => ({
    employee_number: t.employee_number, full_name: t.full_name, gender: t.gender,
    national_id: t.national_id, phone: t.phone, email: t.email,
    qualification: t.qualification, specialization: t.specialization,
    employment_date: t.employment_date, center: (t as any).ecde_centers?.name || "",
    is_active: t.is_active,
  })), [teachers]);

  const inventoryExport = useMemo(() => items.map(i => ({
    name: i.name, category: i.category, sku: i.sku || "", unit: i.unit,
    current_quantity: i.current_quantity, reorder_level: i.reorder_level,
    unit_cost: i.unit_cost, total_value: (Number(i.current_quantity) || 0) * (Number(i.unit_cost) || 0),
    expiry_date: i.expiry_date || "",
  })), [items]);

  const deliveriesExport = useMemo(() => fDeliveries.map(d => ({
    delivery_date: d.delivery_date, item_name: d.item_name, category: d.category,
    quantity: d.quantity, unit: d.unit, delivered_by: d.delivered_by || "",
    reference_number: d.reference_number || "",
    center: (d as any).ecde_centers?.name || "", notes: d.notes || "",
  })), [fDeliveries]);

  const utilizationExport = useMemo(() => fUtilization.map(u => ({
    utilization_date: u.utilization_date,
    item_name: (u as any).inventory_items?.name || "",
    category: (u as any).inventory_items?.category || "",
    quantity: u.quantity, beneficiaries: u.beneficiaries || 0,
    class_level: u.class_level || "", purpose: u.purpose || "",
    center: (u as any).ecde_centers?.name || "", notes: u.notes || "",
  })), [fUtilization]);

  const requisitionsExport = useMemo(() => fRequisitions.map(r => ({
    created_at: r.created_at, status: r.status, reason: r.reason || "",
    items_count: (r as any).requisition_items?.length || 0,
    center: (r as any).ecde_centers?.name || "", reviewed_at: r.reviewed_at || "",
  })), [fRequisitions]);

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" /> Reports & Analytics
          </h1>
          <p className="page-description">Comprehensive system records and downloadable reports</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
          </div>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Students" value={fStudents.length} icon={<GraduationCap className="w-5 h-5" />} />
        <StatCard title="Teachers" value={teachers.length} icon={<Users className="w-5 h-5" />} variant="primary" />
        <StatCard title="Centers" value={centers.length} icon={<School className="w-5 h-5" />} variant="secondary" />
        <StatCard title="Inventory Items" value={items.length} icon={<Package className="w-5 h-5" />} variant="accent" />
        <StatCard title="Ministry Deliveries" value={fDeliveries.length} icon={<Truck className="w-5 h-5" />} />
        <StatCard title="Utilization Logs" value={fUtilization.length} icon={<Activity className="w-5 h-5" />} />
        <StatCard title="Requisitions" value={fRequisitions.length} icon={<ClipboardCheck className="w-5 h-5" />} />
        <StatCard title="Low Stock Alerts" value={lowStock.length} icon={<AlertCircle className="w-5 h-5" />} variant={lowStock.length ? "accent" : "default"} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="centers">Centers</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Approval Status (Students)</CardTitle></CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={approvalCounts} dataKey="value" nameKey="name" outerRadius={90} label>
                      {approvalCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Inventory by Category</CardTitle></CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventoryByCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="qty" fill="hsl(var(--primary))" name="Quantity" />
                    <Bar dataKey="items" fill="hsl(var(--accent))" name="Item Types" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Delivered (qty)</p>
              <p className="text-3xl font-bold mt-1">{totalDeliveredQty.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">Across {fDeliveries.length} deliveries</p>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Utilized (qty)</p>
              <p className="text-3xl font-bold mt-1">{totalUtilizedQty.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">Across {fUtilization.length} logs</p>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Beneficiaries</p>
              <p className="text-3xl font-bold mt-1">{totalBeneficiaries.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">Children served</p>
            </CardContent></Card>
          </div>

          {lowStock.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" /> Low Stock Items
              </CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Item</TableHead><TableHead>Category</TableHead>
                    <TableHead>Current</TableHead><TableHead>Reorder Level</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {lowStock.slice(0, 10).map(i => (
                      <TableRow key={i.id}>
                        <TableCell>{i.name}</TableCell>
                        <TableCell><Badge variant="outline">{i.category}</Badge></TableCell>
                        <TableCell className="text-destructive font-semibold">{i.current_quantity} {i.unit}</TableCell>
                        <TableCell>{i.reorder_level} {i.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* STUDENTS */}
        <TabsContent value="students">
          <ReportTable
            title="Student Records"
            count={studentsExport.length}
            data={studentsExport}
            filename="students-report"
            columns={["admission_number","full_name","gender","class_level","center","sub_county","approval_status"]}
          />
        </TabsContent>

        {/* TEACHERS */}
        <TabsContent value="teachers">
          <ReportTable
            title="Teacher Records"
            count={teachersExport.length}
            data={teachersExport}
            filename="teachers-report"
            columns={["employee_number","full_name","gender","qualification","center","is_active"]}
          />
        </TabsContent>

        {/* CENTERS */}
        <TabsContent value="centers">
          <ReportTable
            title="Center Performance"
            count={centerStats.length}
            data={centerStats}
            filename="centers-report"
            columns={["name","sub_county","ward","students","teachers","capacity","enrollment_rate","student_teacher_ratio"]}
          />
        </TabsContent>

        {/* INVENTORY */}
        <TabsContent value="inventory">
          <ReportTable
            title="Inventory Stock"
            count={inventoryExport.length}
            data={inventoryExport}
            filename="inventory-report"
            columns={["name","category","unit","current_quantity","reorder_level","unit_cost","total_value","expiry_date"]}
          />
        </TabsContent>

        {/* DELIVERIES */}
        <TabsContent value="deliveries">
          <ReportTable
            title="Ministry Deliveries"
            count={deliveriesExport.length}
            data={deliveriesExport}
            filename="deliveries-report"
            columns={["delivery_date","item_name","category","quantity","unit","center","reference_number"]}
          />
        </TabsContent>

        {/* UTILIZATION */}
        <TabsContent value="utilization">
          <ReportTable
            title="Utilization & Distribution Logs"
            count={utilizationExport.length}
            data={utilizationExport}
            filename="utilization-report"
            columns={["utilization_date","item_name","category","quantity","beneficiaries","class_level","center","purpose"]}
          />
        </TabsContent>

        {/* REQUISITIONS */}
        <TabsContent value="requisitions">
          <ReportTable
            title="Requisitions"
            count={requisitionsExport.length}
            data={requisitionsExport}
            filename="requisitions-report"
            columns={["created_at","status","items_count","center","reason","reviewed_at"]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportTable({ title, data, filename, columns, count }: {
  title: string; data: Record<string, unknown>[]; filename: string; columns: string[]; count: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" /> {title}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{count} record{count === 1 ? "" : "s"}</p>
        </div>
        <DataActions data={data} filename={filename} />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(c => <TableHead key={c}>{c.replace(/_/g, " ")}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>
            ) : data.slice(0, 100).map((row, idx) => (
              <TableRow key={idx}>
                {columns.map(c => (
                  <TableCell key={c} className="text-sm">
                    {formatCell(row[c])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.length > 100 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Showing first 100 of {data.length} records. Export for full data.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function formatCell(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    try { return format(new Date(v), "PP"); } catch { return v; }
  }
  return String(v);
}
