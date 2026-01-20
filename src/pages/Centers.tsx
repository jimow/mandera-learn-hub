import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, MapPin, Users, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data for demo
const mockCenters = [
  {
    id: "1",
    code: "MAN/ECDE/001",
    name: "Elwak ECDE Center",
    location: "Elwak Town",
    sub_county: "Mandera South",
    ward: "Elwak",
    capacity: 60,
    current_students: 48,
    teachers_count: 3,
    is_active: true,
  },
  {
    id: "2",
    code: "MAN/ECDE/002",
    name: "Mandera Town ECDE",
    location: "Mandera Town",
    sub_county: "Mandera East",
    ward: "Township",
    capacity: 80,
    current_students: 72,
    teachers_count: 5,
    is_active: true,
  },
  {
    id: "3",
    code: "MAN/ECDE/003",
    name: "Rhamu ECDE Center",
    location: "Rhamu",
    sub_county: "Mandera North",
    ward: "Rhamu",
    capacity: 50,
    current_students: 35,
    teachers_count: 2,
    is_active: true,
  },
  {
    id: "4",
    code: "MAN/ECDE/004",
    name: "Lafey ECDE Center",
    location: "Lafey Town",
    sub_county: "Lafey",
    ward: "Lafey",
    capacity: 40,
    current_students: 28,
    teachers_count: 2,
    is_active: true,
  },
  {
    id: "5",
    code: "MAN/ECDE/005",
    name: "Banissa ECDE Center",
    location: "Banissa",
    sub_county: "Banissa",
    ward: "Banissa",
    capacity: 45,
    current_students: 0,
    teachers_count: 0,
    is_active: false,
  },
];

export default function Centers() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCenters = mockCenters.filter((center) =>
    center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    center.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    center.sub_county.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getOccupancyColor = (current: number, capacity: number) => {
    const ratio = current / capacity;
    if (ratio >= 0.9) return "text-destructive";
    if (ratio >= 0.7) return "text-warning";
    return "text-success";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">ECDE Centers</h1>
          <p className="page-description">
            Manage early childhood development education centers
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Center
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search centers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      {/* Centers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCenters.map((center) => (
          <div
            key={center.id}
            className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-xs">
                      {center.code}
                    </Badge>
                    <Badge variant={center.is_active ? "default" : "secondary"}>
                      {center.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <h3 className="font-display font-semibold text-lg">{center.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {center.location}, {center.sub_county}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2">
                      <Eye className="w-4 h-4" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Edit className="w-4 h-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-destructive">
                      <Trash2 className="w-4 h-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Stats */}
            <div className="p-6 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <p className={`text-xl font-bold ${getOccupancyColor(center.current_students, center.capacity)}`}>
                  {center.current_students}
                </p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-secondary/10 flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-secondary" />
                </div>
                <p className="text-xl font-bold">{center.teachers_count}</p>
                <p className="text-xs text-muted-foreground">Teachers</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                  <span className="text-lg font-bold text-accent">{center.capacity}</span>
                </div>
                <p className="text-xl font-bold">{Math.round((center.current_students / center.capacity) * 100)}%</p>
                <p className="text-xs text-muted-foreground">Capacity</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="px-6 pb-6">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((center.current_students / center.capacity) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
