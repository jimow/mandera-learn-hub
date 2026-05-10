import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export interface TeacherImportRow {
  employee_number: string;
  full_name: string;
  gender: string;
  national_id: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  qualification?: string;
  specialization?: string;
  employment_date?: string;
  center_name?: string;
  center_code?: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string; data?: TeacherImportRow }>;
}

interface CenterMapping {
  id: string;
  name: string;
  code: string;
}

export const TEACHER_IMPORT_COLUMNS = [
  { key: "employee_number", label: "Employee Number", required: true, example: "EMP001" },
  { key: "full_name", label: "Full Name", required: true, example: "Mary Wanjiku" },
  { key: "gender", label: "Gender", required: true, example: "female", note: "male or female" },
  { key: "national_id", label: "National ID", required: true, example: "12345678" },
  { key: "date_of_birth", label: "Date of Birth", required: false, example: "1990-04-12", note: "YYYY-MM-DD format" },
  { key: "phone", label: "Phone", required: false, example: "+254712345678" },
  { key: "email", label: "Email", required: false, example: "teacher@example.com" },
  { key: "qualification", label: "Qualification", required: false, example: "Diploma in ECDE" },
  { key: "specialization", label: "Specialization", required: false, example: "Early Literacy" },
  { key: "employment_date", label: "Employment Date", required: false, example: "2022-01-15", note: "YYYY-MM-DD format" },
  { key: "center_name", label: "Center Name", required: false, example: "ABC ECDE Center", note: "Must match existing center" },
  { key: "center_code", label: "Center Code", required: false, example: "CTR001", note: "Alternative to center name" },
];

export function useTeacherImport() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fetchCenters = async (): Promise<CenterMapping[]> => {
    const { data, error } = await supabase.from("ecde_centers").select("id, name, code");
    if (error) throw error;
    return data || [];
  };

  const parseFile = async (file: File): Promise<TeacherImportRow[]> => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "csv") {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
          complete: (results) => resolve(results.data as TeacherImportRow[]),
          error: (e) => reject(e),
        });
      });
    } else if (extension === "xlsx" || extension === "xls") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false });
      return data.map((row) => {
        const normalized: Record<string, any> = {};
        Object.entries(row).forEach(([k, v]) => {
          normalized[k.trim().toLowerCase().replace(/\s+/g, "_")] = v;
        });
        return normalized as TeacherImportRow;
      });
    }
    throw new Error("Unsupported file format. Please use CSV or Excel files.");
  };

  const validateRow = (row: TeacherImportRow, n: number, centers: CenterMapping[]): string | null => {
    if (!row.employee_number?.trim()) return `Row ${n}: Employee number is required`;
    if (!row.full_name?.trim()) return `Row ${n}: Full name is required`;
    if (!row.gender?.trim() || !["male", "female"].includes(row.gender.toLowerCase().trim()))
      return `Row ${n}: Gender must be 'male' or 'female'`;
    if (!row.national_id?.trim()) return `Row ${n}: National ID is required`;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (row.date_of_birth?.trim() && !dateRegex.test(row.date_of_birth.trim()))
      return `Row ${n}: Date of birth must be in YYYY-MM-DD format`;
    if (row.employment_date?.trim() && !dateRegex.test(row.employment_date.trim()))
      return `Row ${n}: Employment date must be in YYYY-MM-DD format`;

    if (row.center_name || row.center_code) {
      const match = centers.find(
        (c) =>
          c.name.toLowerCase() === row.center_name?.toLowerCase().trim() ||
          c.code.toLowerCase() === row.center_code?.toLowerCase().trim()
      );
      if (!match) return `Row ${n}: Center "${row.center_name || row.center_code}" not found`;
    }
    return null;
  };

  const resolveCenterId = (row: TeacherImportRow, centers: CenterMapping[]): string | null => {
    if (!row.center_name && !row.center_code) return null;
    const m = centers.find(
      (c) =>
        c.name.toLowerCase() === row.center_name?.toLowerCase().trim() ||
        c.code.toLowerCase() === row.center_code?.toLowerCase().trim()
    );
    return m?.id || null;
  };

  const importMutation = useMutation({
    mutationFn: async (file: File): Promise<ImportResult> => {
      setIsProcessing(true);
      setProgress(0);
      const result: ImportResult = { success: 0, failed: 0, errors: [] };

      try {
        const rows = await parseFile(file);
        if (rows.length === 0) throw new Error("No data found in file");
        const centers = await fetchCenters();

        const empSet = new Set<string>();
        const nidSet = new Set<string>();
        for (let i = 0; i < rows.length; i++) {
          const emp = rows[i].employee_number?.trim().toLowerCase();
          const nid = rows[i].national_id?.trim().toLowerCase();
          if (emp && empSet.has(emp)) {
            result.errors.push({ row: i + 2, message: `Duplicate employee number "${rows[i].employee_number}" in file`, data: rows[i] });
            result.failed++;
          }
          if (nid && nidSet.has(nid) && !result.errors.find((e) => e.row === i + 2)) {
            result.errors.push({ row: i + 2, message: `Duplicate national ID "${rows[i].national_id}" in file`, data: rows[i] });
            result.failed++;
          }
          if (emp) empSet.add(emp);
          if (nid) nidSet.add(nid);
        }

        for (let i = 0; i < rows.length; i++) {
          const err = validateRow(rows[i], i + 2, centers);
          if (err && !result.errors.find((e) => e.row === i + 2)) {
            result.errors.push({ row: i + 2, message: err, data: rows[i] });
            result.failed++;
          }
        }

        const validEmps = rows
          .filter((_, i) => !result.errors.find((e) => e.row === i + 2))
          .map((r) => r.employee_number?.trim())
          .filter(Boolean);

        if (validEmps.length > 0) {
          const { data: existing } = await supabase
            .from("teachers")
            .select("employee_number")
            .in("employee_number", validEmps);
          const existingSet = new Set(existing?.map((s) => s.employee_number.toLowerCase()) || []);
          for (let i = 0; i < rows.length; i++) {
            const emp = rows[i].employee_number?.trim().toLowerCase();
            if (emp && existingSet.has(emp) && !result.errors.find((e) => e.row === i + 2)) {
              result.errors.push({ row: i + 2, message: `Employee number "${rows[i].employee_number}" already exists`, data: rows[i] });
              result.failed++;
            }
          }
        }

        const validRows = rows.filter((_, i) => !result.errors.find((e) => e.row === i + 2));
        for (let i = 0; i < validRows.length; i++) {
          const row = validRows[i];
          setProgress(Math.round(((i + 1) / validRows.length) * 100));
          try {
            const centerId = resolveCenterId(row, centers);
            const { error } = await supabase.from("teachers").insert({
              employee_number: row.employee_number.trim(),
              full_name: row.full_name.trim(),
              gender: row.gender.toLowerCase().trim() as "male" | "female",
              national_id: row.national_id.trim(),
              date_of_birth: row.date_of_birth?.trim() || null,
              phone: row.phone?.trim() || null,
              email: row.email?.trim() || null,
              qualification: row.qualification?.trim() || null,
              specialization: row.specialization?.trim() || null,
              employment_date: row.employment_date?.trim() || null,
              center_id: centerId,
            });
            if (error) {
              const idx = rows.indexOf(row);
              result.errors.push({ row: idx + 2, message: error.message, data: row });
              result.failed++;
            } else {
              result.success++;
            }
          } catch (e) {
            const idx = rows.indexOf(row);
            result.errors.push({ row: idx + 2, message: e instanceof Error ? e.message : "Unknown error", data: row });
            result.failed++;
          }
        }
        return result;
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      if (result.success > 0 && result.failed === 0) {
        toast({ title: "Import Successful", description: `Successfully imported ${result.success} teachers.` });
      } else if (result.success > 0 && result.failed > 0) {
        toast({ title: "Partial Import", description: `Imported ${result.success}. ${result.failed} failed.` });
      } else {
        toast({ title: "Import Failed", description: `All ${result.failed} rows failed to import.`, variant: "destructive" });
      }
    },
    onError: (error) => {
      toast({ title: "Import Error", description: error.message, variant: "destructive" });
    },
  });

  const downloadCsvTemplate = () => {
    const headers = TEACHER_IMPORT_COLUMNS.map((c) => c.key);
    const example = TEACHER_IMPORT_COLUMNS.map((c) => c.example);
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teacher_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = TEACHER_IMPORT_COLUMNS.map((c) => c.label);
    const example = TEACHER_IMPORT_COLUMNS.map((c) => c.example);
    const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
    sheet["!cols"] = TEACHER_IMPORT_COLUMNS.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, sheet, "Teachers");

    const instructions = [
      ["Teacher Import Instructions"],
      [""],
      ["Column", "Required", "Description", "Format/Notes"],
      ...TEACHER_IMPORT_COLUMNS.map((c) => [c.label, c.required ? "Yes" : "No", c.key.replace(/_/g, " "), c.note || ""]),
      [""],
      ["Important Notes:"],
      ["1. Do not modify the column headers in the Teachers sheet"],
      ["2. Dates must be in YYYY-MM-DD format (e.g., 1990-04-12)"],
      ["3. Gender must be either 'male' or 'female'"],
      ["4. Employee numbers and national IDs must be unique"],
      ["5. Center name or code must match an existing center in the system"],
    ];
    const insSheet = XLSX.utils.aoa_to_sheet(instructions);
    insSheet["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 30 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, insSheet, "Instructions");
    XLSX.writeFile(wb, "teacher_import_template.xlsx");
  };

  return {
    importTeachers: importMutation.mutate,
    isProcessing,
    progress,
    isPending: importMutation.isPending,
    downloadCsvTemplate,
    downloadExcelTemplate,
  };
}
