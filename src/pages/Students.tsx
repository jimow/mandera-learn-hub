import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AddStudentDialog } from "@/components/students/AddStudentDialog";

// Mock data for demo
const mockStudents = [
  {
    id: "1",
    admission_number: "MAN/ECDE/2024/001",
    full_name: "Fatuma Hassan Ali",
    gender: "female",
    date_of_birth: "2019-03-15",
    center_name: "Elwak ECDE Center",
    parent_name: "Hassan Ali Mohamed",
    parent_phone: "0712345678",
    is_active: true,
  },
  {
    id: "2",
    admission_number: "MAN/ECDE/2024/002",
    full_name: "Mohamed Abdi Omar",
    gender: "male",
    date_of_birth: "2019-07-22",
    center_name: "Mandera Town ECDE",
    parent_name: "Abdi Omar Hussein",
    parent_phone: "0723456789",
    is_active: true,
  },
  {
    id: "3",
    admission_number: "MAN/ECDE/2024/003",
    full_name: "Amina Ibrahim Yusuf",
    gender: "female",
    date_of_birth: "2020-01-10",
    center_name: "Rhamu ECDE Center",
    parent_name: "Ibrahim Yusuf Aden",
    parent_phone: "0734567890",
    is_active: true,
  },
  {
    id: "4",
    admission_number: "MAN/ECDE/2024/004",
    full_name: "Hussein Ahmed Noor",
    gender: "male",
    date_of_birth: "2019-11-05",
    center_name: "Lafey ECDE Center",
    parent_name: "Ahmed Noor Abdi",
    parent_phone: "0745678901",
    is_active: false,
  },
];

export default function Students() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredStudents = mockStudents.filter((student) =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.admission_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Students</h1>
          <p className="page-description">
            Manage student enrollment and records
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Student
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
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

      {/* Table */}
      <div className="data-table animate-fade-in">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admission No.</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Center</TableHead>
              <TableHead>Parent/Guardian</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-mono text-sm">
                  {student.admission_number}
                </TableCell>
                <TableCell className="font-medium">{student.full_name}</TableCell>
                <TableCell className="capitalize">{student.gender}</TableCell>
                <TableCell>{student.center_name}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{student.parent_name}</p>
                    <p className="text-xs text-muted-foreground">{student.parent_phone}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={student.is_active ? "default" : "secondary"}>
                    {student.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddStudentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
