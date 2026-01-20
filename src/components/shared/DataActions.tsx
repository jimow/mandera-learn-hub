import { Download, Copy, FileDown, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useDataExport } from "@/hooks/useDataExport";

interface DataActionsProps {
  data: Record<string, unknown>[];
  filename: string;
}

export function DataActions({ data, filename }: DataActionsProps) {
  const { exportToCSV, exportToJSON, copyToClipboard } = useDataExport();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => exportToCSV(data, filename)} 
          className="gap-2"
        >
          <FileDown className="w-4 h-4" />
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => exportToJSON(data, filename)} 
          className="gap-2"
        >
          <FileJson className="w-4 h-4" />
          Download JSON
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => copyToClipboard(data)} 
          className="gap-2"
        >
          <Copy className="w-4 h-4" />
          Copy to Clipboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
