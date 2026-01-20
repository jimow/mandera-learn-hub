import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCenters } from "@/hooks/useCenters";
import { useCreateStudent, useUpdateStudent } from "@/hooks/useStudents";
import type { Database } from "@/integrations/supabase/types";
import { useEffect } from "react";

type Student = Database["public"]["Tables"]["students"]["Row"];

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  gender: z.enum(["male", "female"]),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  admission_number: z.string().min(1, "Admission number is required"),
  center_id: z.string().optional(),
  parent_name: z.string().min(2, "Parent name is required"),
  parent_phone: z.string().min(10, "Valid phone number required"),
  parent_email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  special_needs: z.string().optional(),
  admission_date: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface StudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
}

export function StudentDialog({ open, onOpenChange, student }: StudentDialogProps) {
  const { data: centers } = useCenters();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const isEditing = !!student;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      gender: undefined,
      date_of_birth: "",
      admission_number: "",
      center_id: "",
      parent_name: "",
      parent_phone: "",
      parent_email: "",
      address: "",
      special_needs: "",
      admission_date: "",
    },
  });

  useEffect(() => {
    if (student) {
      form.reset({
        full_name: student.full_name,
        gender: student.gender,
        date_of_birth: student.date_of_birth,
        admission_number: student.admission_number,
        center_id: student.center_id || "",
        parent_name: student.parent_name,
        parent_phone: student.parent_phone,
        parent_email: student.parent_email || "",
        address: student.address || "",
        special_needs: student.special_needs || "",
        admission_date: student.admission_date || "",
      });
    } else {
      form.reset({
        full_name: "",
        gender: undefined,
        date_of_birth: "",
        admission_number: "",
        center_id: "",
        parent_name: "",
        parent_phone: "",
        parent_email: "",
        address: "",
        special_needs: "",
        admission_date: new Date().toISOString().split("T")[0],
      });
    }
  }, [student, form]);

  const onSubmit = async (data: FormData) => {
    try {
      const studentData = {
        full_name: data.full_name,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        admission_number: data.admission_number,
        parent_name: data.parent_name,
        parent_phone: data.parent_phone,
        center_id: data.center_id || null,
        parent_email: data.parent_email || null,
        address: data.address || null,
        special_needs: data.special_needs || null,
        admission_date: data.admission_date || null,
      };
      
      if (isEditing && student) {
        await updateStudent.mutateAsync({
          id: student.id,
          ...studentData,
        });
      } else {
        await createStudent.mutateAsync(studentData);
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? "Edit Student" : "Add New Student"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Student Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Student Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter student's full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="admission_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admission Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MAN/ECDE/2024/001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="center_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ECDE Center</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select center" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {centers?.map((center) => (
                            <SelectItem key={center.id} value={center.id}>
                              {center.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="admission_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admission Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Parent/Guardian Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Parent/Guardian Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="parent_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent/Guardian Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter parent's name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parent_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 0712345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parent_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="parent@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Additional Information
              </h3>
              <FormField
                control={form.control}
                name="special_needs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Needs (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special needs or requirements..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createStudent.isPending || updateStudent.isPending}
              >
                {createStudent.isPending || updateStudent.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Update Student"
                  : "Add Student"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
