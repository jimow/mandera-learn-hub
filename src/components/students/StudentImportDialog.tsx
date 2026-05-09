import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileWarning,
} from "lucide-react";
import { useStudentImport, IMPORT_COLUMNS, ImportResult } from "@/hooks/useStudentImport";
import { cn } from "@/lib/utils";

interface StudentImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = "upload" | "processing" | "results";

export function StudentImportDialog({ open, onOpenChange }: StudentImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const {
    importStudents,
    isProcessing,
    progress,
    downloadCsvTemplate,
    downloadExcelTemplate,
  } = useStudentImport();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      alert("Please select a CSV or Excel file (.csv, .xlsx, .xls)");
      return;
    }
    
    setSelectedFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!selectedFile) return;

    setStep("processing");
    importStudents(selectedFile, {
      onSuccess: (result) => {
        setImportResult(result);
        setStep("results");
      },
      onError: () => {
        setStep("upload");
      },
    });
  };

  const handleClose = () => {
    setStep("upload");
    setSelectedFile(null);
    setImportResult(null);
    onOpenChange(false);
  };

  const handleStartOver = () => {
    setStep("upload");
    setSelectedFile(null);
    setImportResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Students
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import multiple students at once
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6">
            {/* Download Templates */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Download Template</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
                  <FileText className="w-4 h-4 mr-2" />
                  CSV Template
                </Button>
                <Button variant="outline" size="sm" onClick={downloadExcelTemplate}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel Template
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Upload className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-input"
                  />
                  <Button variant="outline" asChild>
                    <label htmlFor="file-input" className="cursor-pointer">
                      <Download className="w-4 h-4 mr-2" />
                      Browse Files
                    </label>
                  </Button>
                </div>
              )}
            </div>

            {/* Comprehensive Guide */}
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold">Import Guide</h4>
              </div>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Download a template (CSV or Excel) above.</li>
                <li>Fill in one student per row. Do not rename column headers.</li>
                <li>Required columns must not be blank. Use exact formats below.</li>
                <li>Centers are matched by <strong>name</strong> or <strong>code</strong>. Leave blank to import as unassigned.</li>
                <li>Admission numbers must be unique across the file and the system.</li>
                <li>Save the file and upload it. Errors will be shown row-by-row.</li>
              </ol>
              <ScrollArea className="h-56 rounded border bg-background">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="h-8">Column</TableHead>
                      <TableHead className="h-8 w-20">Required</TableHead>
                      <TableHead className="h-8">Format / Example</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {IMPORT_COLUMNS.map((col) => (
                      <TableRow key={col.key}>
                        <TableCell className="py-1.5 text-xs font-medium">{col.label}</TableCell>
                        <TableCell className="py-1.5 text-xs">
                          {col.required ? (
                            <Badge variant="default" className="text-[10px]">Required</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Optional</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 text-xs text-muted-foreground">
                          <code className="text-[11px]">{col.example}</code>
                          {col.note && <span className="block text-[10px] italic">{col.note}</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Import Button */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!selectedFile}>
                <Upload className="w-4 h-4 mr-2" />
                Import Students
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 space-y-6">
            <div className="text-center space-y-4">
              <div className="animate-spin mx-auto w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
              <div>
                <p className="font-medium">Importing students...</p>
                <p className="text-sm text-muted-foreground">
                  Please wait while we process your file
                </p>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">{progress}% complete</p>
          </div>
        )}

        {step === "results" && importResult && (
          <div className="space-y-6 flex-1 overflow-hidden flex flex-col">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-primary/10 text-center">
                <CheckCircle className="w-8 h-8 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold text-primary">{importResult.success}</p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 text-center">
                <XCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
                <p className="text-2xl font-bold text-destructive">{importResult.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <FileWarning className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-2xl font-bold">{importResult.success + importResult.failed}</p>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </div>
            </div>

            {/* Error Details */}
            {importResult.errors.length > 0 && (
              <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <h4 className="font-medium">Import Errors</h4>
                </div>
                <ScrollArea className="flex-1 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead className="w-40">Student</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.errors.map((error, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{error.row}</TableCell>
                          <TableCell className="text-sm">
                            {error.data?.full_name || error.data?.admission_number || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-destructive">
                            {error.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleStartOver}>
                Import More
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
