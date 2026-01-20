import { useCallback } from "react";
import { toast } from "sonner";

type ExportFormat = "csv" | "json";

export function useDataExport() {
  const exportToCSV = useCallback((data: Record<string, unknown>[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return "";
            if (typeof value === "object") return JSON.stringify(value).replace(/,/g, ";");
            return String(value).includes(",") ? `"${value}"` : String(value);
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `${filename}.csv`);
    toast.success("Data exported successfully!");
  }, []);

  const exportToJSON = useCallback((data: Record<string, unknown>[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    downloadBlob(blob, `${filename}.json`);
    toast.success("Data exported successfully!");
  }, []);

  const copyToClipboard = useCallback(async (data: Record<string, unknown>[]) => {
    if (!data || data.length === 0) {
      toast.error("No data to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success("Data copied to clipboard!");
    } catch {
      toast.error("Failed to copy data");
    }
  }, []);

  const exportData = useCallback(
    (data: Record<string, unknown>[], filename: string, format: ExportFormat = "csv") => {
      if (format === "csv") {
        exportToCSV(data, filename);
      } else {
        exportToJSON(data, filename);
      }
    },
    [exportToCSV, exportToJSON]
  );

  return { exportData, exportToCSV, exportToJSON, copyToClipboard };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
