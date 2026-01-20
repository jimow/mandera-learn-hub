import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Mock data for demo
const mockTeachers = [
  {
    id: "1",
    employee_number: "MAN/TCH/001",
    full_name: "Amina Osman Hussein",
    gender: "female",
    qualification: "Diploma in ECDE",
    center_name: "Elwak ECDE Center",
    phone: "0712345678",
    email: "amina.osman@email.com",
    is_active: true,
  },
  {
    id: "2",
    employee_number: "MAN/TCH/002",
    full_name: "Ahmed Ibrahim Noor",
    gender: "male",
    qualification: "Certificate in ECDE",
    center_name: "Mandera Town ECDE",
    phone: "0723456789",
    email: "ahmed.ibrahim@email.com",
    is_active: true,
  },
  {
    id: "3",
    employee_number: "MAN/TCH/003",
    full_name: "Halima Abdi Mohamed",
    gender: "female",
    qualification: "Bachelors in Education",
    center_name: "Rhamu ECDE Center",
    phone: "0734567890",
    email: "halima.abdi@email.com",
    is_active: true,
  },
  {
    id: "4",
    employee_number: "MAN/TCH/004",
    full_name: "Yusuf Ali Hassan",
    gender: "male",
    qualification: "Diploma in ECDE",
    center_name: "Lafey ECDE Center",
    phone: "0745678901",
    email: "yusuf.ali@email.com",
    is_active: false,
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Teachers() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTeachers = mockTeachers.filter((teacher) =>
    teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.employee_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Teachers</h1>
          <p className="page-description">
            Manage ECDE teachers and their assignments
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Teacher
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search teachers..."
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

      {/* Teacher Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers.map((teacher) => (
          <div
            key={teacher.id}
            className="bg-card rounded-xl border border-border p-6 animate-fade-in hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                    {getInitials(teacher.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{teacher.full_name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    {teacher.employee_number}
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2">
                    <Eye className="w-4 h-4" /> View Profile
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

            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Assigned Center
                </p>
                <p className="text-sm font-medium">{teacher.center_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Qualification
                </p>
                <p className="text-sm">{teacher.qualification}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {teacher.phone}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <Badge variant={teacher.is_active ? "default" : "secondary"}>
                {teacher.is_active ? "Active" : "Inactive"}
              </Badge>
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                <Mail className="w-3 h-3" />
                Contact
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
