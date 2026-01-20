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
import { useCreateCenter, useUpdateCenter } from "@/hooks/useCenters";
import { useSubCounties, useWards } from "@/hooks/useSubCounties";
import type { Database } from "@/integrations/supabase/types";
import { useEffect, useState } from "react";

type Center = Database["public"]["Tables"]["ecde_centers"]["Row"];

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(1, "Center code is required"),
  location: z.string().min(1, "Location is required"),
  sub_county: z.string().min(1, "Sub-county is required"),
  ward: z.string().min(1, "Ward is required"),
  capacity: z.number().min(1, "Capacity must be at least 1").optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  established_date: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface CenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  center?: Center | null;
}

export function CenterDialog({ open, onOpenChange, center }: CenterDialogProps) {
  const createCenter = useCreateCenter();
  const updateCenter = useUpdateCenter();
  const isEditing = !!center;
  
  const { data: subCounties } = useSubCounties();
  const [selectedSubCountyId, setSelectedSubCountyId] = useState<string>("");
  const { data: wards } = useWards(selectedSubCountyId);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      location: "",
      sub_county: "",
      ward: "",
      capacity: 50,
      contact_phone: "",
      contact_email: "",
      established_date: "",
      latitude: null,
      longitude: null,
    },
  });

  useEffect(() => {
    if (center) {
      // Find sub-county ID by name
      const subCounty = subCounties?.find(sc => sc.name === center.sub_county);
      if (subCounty) {
        setSelectedSubCountyId(subCounty.id);
      }
      
      form.reset({
        name: center.name,
        code: center.code,
        location: center.location,
        sub_county: center.sub_county,
        ward: center.ward,
        capacity: center.capacity || 50,
        contact_phone: center.contact_phone || "",
        contact_email: center.contact_email || "",
        established_date: center.established_date || "",
        latitude: (center as any).latitude || null,
        longitude: (center as any).longitude || null,
      });
    } else {
      setSelectedSubCountyId("");
      form.reset({
        name: "",
        code: "",
        location: "",
        sub_county: "",
        ward: "",
        capacity: 50,
        contact_phone: "",
        contact_email: "",
        established_date: "",
        latitude: null,
        longitude: null,
      });
    }
  }, [center, form, subCounties]);

  const handleSubCountyChange = (subCountyName: string) => {
    const subCounty = subCounties?.find(sc => sc.name === subCountyName);
    setSelectedSubCountyId(subCounty?.id || "");
    form.setValue("sub_county", subCountyName);
    form.setValue("ward", ""); // Reset ward when sub-county changes
  };

  const onSubmit = async (data: FormData) => {
    try {
      const centerData = {
        name: data.name,
        code: data.code,
        location: data.location,
        sub_county: data.sub_county,
        ward: data.ward,
        capacity: data.capacity,
        contact_phone: data.contact_phone || null,
        contact_email: data.contact_email || null,
        established_date: data.established_date || null,
        latitude: data.latitude,
        longitude: data.longitude,
      };
      
      if (isEditing && center) {
        await updateCenter.mutateAsync({
          id: center.id,
          ...centerData,
        });
      } else {
        await createCenter.mutateAsync(centerData);
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
            {isEditing ? "Edit ECDE Center" : "Add New ECDE Center"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Center Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter center name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Center Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MAN/ECDE/001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Capacity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g., 50" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="established_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Established Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Location Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Location Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sub_county"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-County</FormLabel>
                      <Select 
                        onValueChange={handleSubCountyChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sub-county" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subCounties?.map((sc) => (
                            <SelectItem key={sc.id} value={sc.name}>
                              {sc.name}
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
                  name="ward"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ward</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedSubCountyId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ward" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {wards?.map((ward) => (
                            <SelectItem key={ward.id} value={ward.name}>
                              {ward.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Geo Coordinates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.000001"
                          placeholder="e.g., 3.9366" 
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.000001"
                          placeholder="e.g., 41.8569" 
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
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
                  name="contact_phone"
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
                  name="contact_email"
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
                disabled={createCenter.isPending || updateCenter.isPending}
              >
                {createCenter.isPending || updateCenter.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Update Center"
                  : "Add Center"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
