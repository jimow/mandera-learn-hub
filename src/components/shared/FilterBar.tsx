import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type FilterOption = { value: string; label: string };
export type FilterDef = {
  key: string;
  label: string;
  options: FilterOption[];
  /** Show inline (always visible) or hidden in "More filters" popover */
  primary?: boolean;
  placeholder?: string;
};

type Props = {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters: FilterDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
};

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  values,
  onChange,
  onClear,
}: Props) {
  const primary = filters.filter((f) => f.primary !== false);
  const secondary = filters.filter((f) => f.primary === false);

  const isActive = (f: FilterDef) =>
    values[f.key] !== undefined && values[f.key] !== "all";

  const activeFilters = filters.filter(isActive);
  const activeCount = activeFilters.length;
  const secondaryActiveCount = secondary.filter(isActive).length;

  const labelFor = (f: FilterDef) =>
    f.options.find((o) => o.value === values[f.key])?.label ?? values[f.key];

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-end gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Primary filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-row lg:flex-1 gap-3">
          {primary.map((f) => (
            <div
              key={f.key}
              className="space-y-1.5 lg:flex-1 lg:min-w-[130px]"
            >
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Select
                value={values[f.key] ?? "all"}
                onValueChange={(v) => onChange(f.key, v)}
              >
                <SelectTrigger
                  className={isActive(f) ? "border-primary/50 bg-primary/5" : ""}
                >
                  <SelectValue placeholder={f.placeholder ?? "All"} />
                </SelectTrigger>
                <SelectContent className="bg-popover max-h-72">
                  {f.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-end gap-2">
          {secondary.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 relative">
                  <SlidersHorizontal className="w-4 h-4" />
                  More
                  {secondaryActiveCount > 0 && (
                    <Badge
                      variant="default"
                      className="ml-1 h-5 min-w-5 px-1.5 rounded-full text-[10px]"
                    >
                      {secondaryActiveCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 bg-popover" align="end">
                <div className="space-y-3">
                  <p className="text-sm font-medium">More filters</p>
                  {secondary.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {f.label}
                      </Label>
                      <Select
                        value={values[f.key] ?? "all"}
                        onValueChange={(v) => onChange(f.key, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={f.placeholder ?? "All"} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover max-h-64">
                          {f.options.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              onClick={onClear}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
          <span className="text-xs text-muted-foreground">Active:</span>
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => onChange(f.key, "all")}
              className="group inline-flex items-center gap-1.5 rounded-full border bg-secondary/60 hover:bg-secondary px-2.5 py-1 text-xs transition-colors"
            >
              <span className="text-muted-foreground">{f.label}:</span>
              <span className="font-medium">{labelFor(f)}</span>
              <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
