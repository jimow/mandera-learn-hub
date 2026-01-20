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
import { useCenters } from "@/hooks/useCenters";
import { useCreateTeacher, useUpdateTeacher } from "@/hooks/useTeachers";
import type { Database } from "@/integrations/supabase/types";
import { useEffect } from "react";

type Teacher = Database["public"]["Tables"]["teachers"]["Row"];

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  gender: z.enum(["male", "female"]),
  employee_number: z.string().min(1, "Employee number is required"),
  national_id: z.string().min(1, "National ID is required"),
  date_of_birth: z.string().optional(),
  center_id: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  employment_date: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher | null;
}

export function TeacherDialog({ open, onOpenChange, teacher }: TeacherDialogProps) {
  const { data: centers } = useCenters();
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();
  const isEditing = !!teacher;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      gender: undefined,
      employee_number: "",
      national_id: "",
      date_of_birth: "",
      center_id: "",
      phone: "",
      email: "",
      qualification: "",
      specialization: "",
      employment_date: "",
    },
  });

  useEffect(() => {
    if (teacher) {
      form.reset({
        full_name: teacher.full_name,
        gender: teacher.gender,
        employee_number: teacher.employee_number,
        national_id: teacher.national_id,
        date_of_birth: teacher.date_of_birth || "",
        center_id: teacher.center_id || "",
        phone: teacher.phone || "",
        email: teacher.email || "",
        qualification: teacher.qualification || "",
        specialization: teacher.specialization || "",
        employment_date: teacher.employment_date || "",
      });
    } else {
      form.reset({
        full_name: "",
        gender: undefined,
        employee_number: "",
        national_id: "",
        date_of_birth: "",
        center_id: "",
        phone: "",
        email: "",
        qualification: "",
        specialization: "",
        employment_date: "",
      });
    }
  }, [teacher, form]);

  const onSubmit = async (data: FormData) => {
    try {
      const teacherData = {
        full_name: data.full_name,
        gender: data.gender,
        employee_number: data.employee_number,
        national_id: data.national_id,
        center_id: data.center_id || null,
        email: data.email || null,
        phone: data.phone || null,
        date_of_birth: data.date_of_birth || null,
        qualification: data.qualification || null,
        specialization: data.specialization || null,
        employment_date: data.employment_date || null,
      };
      
      if (isEditing && teacher) {
        await updateTeacher.mutateAsync({
          id: teacher.id,
          ...teacherData,
        });
      } else {
        await createTeacher.mutateAsync(teacherData);
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
            {isEditing ? "Edit Teacher" : "Add New Teacher"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
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
                  name="national_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>National ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter national ID" {...field} />
                      </FormControl>
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
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Employment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="employee_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MAN/TCH/001" {...field} />
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
                      <FormLabel>Assigned Center</FormLabel>
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
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualification</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Diploma in ECDE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Early Childhood" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="employment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employment Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTeacher.isPending || updateTeacher.isPending}
              >
                {createTeacher.isPending || updateTeacher.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Update Teacher"
                  : "Add Teacher"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
