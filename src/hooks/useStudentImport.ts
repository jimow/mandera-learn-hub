import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export interface ImportRow {
  admission_number: string;
  full_name: string;
  gender: string;
  date_of_birth: string;
  class_level?: string;
  parent_name: string;
  parent_phone: string;
  parent_email?: string;
  address?: string;
  special_needs?: string;
  center_name?: string;
  center_code?: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string; data?: ImportRow }>;
}

interface CenterMapping {
  id: string;
  name: string;
  code: string;
}

// Template columns configuration
export const IMPORT_COLUMNS = [
  { key: "admission_number", label: "Admission Number", required: true, example: "ADM001" },
  { key: "full_name", label: "Full Name", required: true, example: "John Doe" },
  { key: "gender", label: "Gender", required: true, example: "male", note: "male or female" },
  { key: "date_of_birth", label: "Date of Birth", required: true, example: "2019-05-15", note: "YYYY-MM-DD format" },
  { key: "class_level", label: "Class Level", required: false, example: "pp1", note: "pp1 or pp2" },
  { key: "parent_name", label: "Parent/Guardian Name", required: true, example: "Jane Doe" },
  { key: "parent_phone", label: "Parent Phone", required: true, example: "+254712345678" },
  { key: "parent_email", label: "Parent Email", required: false, example: "parent@example.com" },
  { key: "address", label: "Address", required: false, example: "123 Main Street" },
  { key: "special_needs", label: "Special Needs", required: false, example: "None" },
  { key: "center_name", label: "Center Name", required: false, example: "ABC ECDE Center", note: "Must match existing center" },
  { key: "center_code", label: "Center Code", required: false, example: "CTR001", note: "Alternative to center name" },
];

export function useStudentImport() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all centers for mapping
  const fetchCenters = async (): Promise<CenterMapping[]> => {
    const { data, error } = await supabase
      .from("ecde_centers")
      .select("id, name, code");
    
    if (error) throw error;
    return data || [];
  };

  // Parse file (CSV or Excel)
  const parseFile = async (file: File): Promise<ImportRow[]> => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, "_"),
          complete: (results) => {
            resolve(results.data as ImportRow[]);
          },
          error: (error) => reject(error),
        });
      });
    } else if (extension === "xlsx" || extension === "xls") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { raw: false });
      
      // Normalize headers
      return data.map((row) => {
        const normalized: Record<string, any> = {};
        Object.entries(row).forEach(([key, value]) => {
          const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");
          normalized[normalizedKey] = value;
        });
        return normalized as ImportRow;
      });
    }

    throw new Error("Unsupported file format. Please use CSV or Excel files.");
  };

  // Validate a single row
  const validateRow = (row: ImportRow, rowNumber: number, centers: CenterMapping[]): string | null => {
    if (!row.admission_number?.trim()) {
      return `Row ${rowNumber}: Admission number is required`;
    }
    if (!row.full_name?.trim()) {
      return `Row ${rowNumber}: Full name is required`;
    }
    if (!row.gender?.trim() || !["male", "female"].includes(row.gender.toLowerCase().trim())) {
      return `Row ${rowNumber}: Gender must be 'male' or 'female'`;
    }
    if (!row.date_of_birth?.trim()) {
      return `Row ${rowNumber}: Date of birth is required`;
    }
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(row.date_of_birth.trim())) {
      return `Row ${rowNumber}: Date of birth must be in YYYY-MM-DD format`;
    }
    if (!row.parent_name?.trim()) {
      return `Row ${rowNumber}: Parent name is required`;
    }
    if (!row.parent_phone?.trim()) {
      return `Row ${rowNumber}: Parent phone is required`;
    }
    if (row.class_level && !["pp1", "pp2"].includes(row.class_level.toLowerCase().trim())) {
      return `Row ${rowNumber}: Class level must be 'pp1' or 'pp2'`;
    }

    // Validate center exists if provided
    if (row.center_name || row.center_code) {
      const centerMatch = centers.find(
        (c) =>
          c.name.toLowerCase() === row.center_name?.toLowerCase().trim() ||
          c.code.toLowerCase() === row.center_code?.toLowerCase().trim()
      );
      if (!centerMatch) {
        return `Row ${rowNumber}: Center "${row.center_name || row.center_code}" not found`;
      }
    }

    return null;
  };

  // Resolve center ID from name or code
  const resolveCenterId = (row: ImportRow, centers: CenterMapping[]): string | null => {
    if (!row.center_name && !row.center_code) return null;
    
    const centerMatch = centers.find(
      (c) =>
        c.name.toLowerCase() === row.center_name?.toLowerCase().trim() ||
        c.code.toLowerCase() === row.center_code?.toLowerCase().trim()
    );
    
    return centerMatch?.id || null;
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File): Promise<ImportResult> => {
      setIsProcessing(true);
      setProgress(0);

      const result: ImportResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      try {
        // Parse file
        const rows = await parseFile(file);
        if (rows.length === 0) {
          throw new Error("No data found in file");
        }

        // Fetch centers for mapping
        const centers = await fetchCenters();

        // Get current user for created_by
        const { data: { user } } = await supabase.auth.getUser();

        // Check for duplicate admission numbers in file
        const admissionNumbers = new Set<string>();
        for (let i = 0; i < rows.length; i++) {
          const admNum = rows[i].admission_number?.trim().toLowerCase();
          if (admNum && admissionNumbers.has(admNum)) {
            result.errors.push({
              row: i + 2,
              message: `Duplicate admission number "${rows[i].admission_number}" in import file`,
              data: rows[i],
            });
            result.failed++;
          }
          if (admNum) admissionNumbers.add(admNum);
        }

        // Validate all rows first
        for (let i = 0; i < rows.length; i++) {
          const error = validateRow(rows[i], i + 2, centers);
          if (error && !result.errors.find(e => e.row === i + 2)) {
            result.errors.push({ row: i + 2, message: error, data: rows[i] });
            result.failed++;
          }
        }

        // Check for existing admission numbers in database
        const validAdmissionNumbers = rows
          .filter((_, i) => !result.errors.find(e => e.row === i + 2))
          .map(r => r.admission_number?.trim())
          .filter(Boolean);

        if (validAdmissionNumbers.length > 0) {
          const { data: existingStudents } = await supabase
            .from("students")
            .select("admission_number")
            .in("admission_number", validAdmissionNumbers);

          const existingSet = new Set(existingStudents?.map(s => s.admission_number.toLowerCase()) || []);

          for (let i = 0; i < rows.length; i++) {
            const admNum = rows[i].admission_number?.trim().toLowerCase();
            if (admNum && existingSet.has(admNum) && !result.errors.find(e => e.row === i + 2)) {
              result.errors.push({
                row: i + 2,
                message: `Admission number "${rows[i].admission_number}" already exists in database`,
                data: rows[i],
              });
              result.failed++;
            }
          }
        }

        // Insert valid rows
        const validRows = rows.filter((_, i) => !result.errors.find(e => e.row === i + 2));
        
        for (let i = 0; i < validRows.length; i++) {
          const row = validRows[i];
          setProgress(Math.round(((i + 1) / validRows.length) * 100));

          try {
            const centerId = resolveCenterId(row, centers);
            
            const { error } = await supabase.from("students").insert({
              admission_number: row.admission_number.trim(),
              full_name: row.full_name.trim(),
              gender: row.gender.toLowerCase().trim() as "male" | "female",
              date_of_birth: row.date_of_birth.trim(),
              class_level: (row.class_level?.toLowerCase().trim() as "pp1" | "pp2") || "pp1",
              parent_name: row.parent_name.trim(),
              parent_phone: row.parent_phone.trim(),
              parent_email: row.parent_email?.trim() || null,
              address: row.address?.trim() || null,
              special_needs: row.special_needs?.trim() || null,
              center_id: centerId,
              created_by: user?.id,
              approval_status: "pending",
            });

            if (error) {
              const originalIndex = rows.indexOf(row);
              result.errors.push({
                row: originalIndex + 2,
                message: error.message,
                data: row,
              });
              result.failed++;
            } else {
              result.success++;
            }
          } catch (err) {
            const originalIndex = rows.indexOf(row);
            result.errors.push({
              row: originalIndex + 2,
              message: err instanceof Error ? err.message : "Unknown error",
              data: row,
            });
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
      queryClient.invalidateQueries({ queryKey: ["students"] });
      
      if (result.success > 0 && result.failed === 0) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.success} students.`,
        });
      } else if (result.success > 0 && result.failed > 0) {
        toast({
          title: "Partial Import",
          description: `Imported ${result.success} students. ${result.failed} failed.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Import Failed",
          description: `All ${result.failed} rows failed to import.`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Import Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate CSV template
  const downloadCsvTemplate = () => {
    const headers = IMPORT_COLUMNS.map((c) => c.key);
    const exampleRow = IMPORT_COLUMNS.map((c) => c.example);
    
    const csv = [headers.join(","), exampleRow.join(",")].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student_import_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Generate Excel template
  const downloadExcelTemplate = () => {
    const workbook = XLSX.utils.book_new();
    
    // Create data sheet with headers and example
    const headers = IMPORT_COLUMNS.map((c) => c.label);
    const exampleRow = IMPORT_COLUMNS.map((c) => c.example);
    const dataSheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    
    // Set column widths
    const colWidths = IMPORT_COLUMNS.map(() => ({ wch: 20 }));
    dataSheet["!cols"] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, dataSheet, "Students");
    
    // Create instructions sheet
    const instructions = [
      ["Student Import Instructions"],
      [""],
      ["Column", "Required", "Description", "Format/Notes"],
      ...IMPORT_COLUMNS.map((c) => [
        c.label,
        c.required ? "Yes" : "No",
        c.key.replace(/_/g, " "),
        c.note || "",
      ]),
      [""],
      ["Important Notes:"],
      ["1. Do not modify the column headers in the Students sheet"],
      ["2. Date of birth must be in YYYY-MM-DD format (e.g., 2019-05-15)"],
      ["3. Gender must be either 'male' or 'female'"],
      ["4. Class level must be either 'pp1' or 'pp2'"],
      ["5. Center name or code must match an existing center in the system"],
      ["6. Admission numbers must be unique"],
    ];
    
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
    instructionsSheet["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 30 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
    
    XLSX.writeFile(workbook, "student_import_template.xlsx");
  };

  return {
    importStudents: importMutation.mutate,
    isProcessing,
    progress,
    isPending: importMutation.isPending,
    downloadCsvTemplate,
    downloadExcelTemplate,
  };
}
