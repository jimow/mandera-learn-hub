import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateWard, useUpdateWard } from "@/hooks/useWardsManagement";
import { useCounties } from "@/hooks/useCounties";
import { useSubCountiesWithCounty } from "@/hooks/useSubCountiesManagement";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  sub_county_id: z.string().min(1, "Sub-County is required"),
});

type FormData = z.infer<typeof formSchema>;

interface WardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ward?: { id: string; name: string; code: string; sub_county_id: string } | null;
}

export function WardDialog({ open, onOpenChange, ward }: WardDialogProps) {
  const isEditing = !!ward;
  const createWard = useCreateWard();
  const updateWard = useUpdateWard();
  const { data: counties } = useCounties();
  const { data: subCounties } = useSubCountiesWithCounty();
  
  const [selectedCountyId, setSelectedCountyId] = useState<string | undefined>();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      sub_county_id: "",
    },
  });

  useEffect(() => {
    if (ward) {
      form.reset({
        name: ward.name,
        code: ward.code,
        sub_county_id: ward.sub_county_id,
      });
      // Find the county for this sub-county
      const subCounty = subCounties?.find(sc => sc.id === ward.sub_county_id);
      setSelectedCountyId(subCounty?.county_id || undefined);
    } else {
      form.reset({
        name: "",
        code: "",
        sub_county_id: "",
      });
      setSelectedCountyId(undefined);
    }
  }, [ward, form, subCounties]);

  const filteredSubCounties = selectedCountyId 
    ? subCounties?.filter(sc => sc.county_id === selectedCountyId)
    : subCounties;

  const onSubmit = async (data: FormData) => {
    const payload = { name: data.name, code: data.code, sub_county_id: data.sub_county_id };
    if (isEditing && ward) {
      await updateWard.mutateAsync({ id: ward.id, ...payload });
    } else {
      await createWard.mutateAsync(payload);
    }
    onOpenChange(false);
    form.reset();
    setSelectedCountyId(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Ward" : "Add Ward"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormItem>
              <FormLabel>County (Filter)</FormLabel>
              <Select 
                value={selectedCountyId} 
                onValueChange={(value) => {
                  setSelectedCountyId(value);
                  form.setValue("sub_county_id", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select county to filter" />
                </SelectTrigger>
                <SelectContent>
                  {counties?.map((county) => (
                    <SelectItem key={county.id} value={county.id}>
                      {county.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
            <FormField
              control={form.control}
              name="sub_county_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub-County *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sub-county" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredSubCounties?.map((subCounty) => (
                        <SelectItem key={subCounty.id} value={subCounty.id}>
                          {subCounty.name}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Arabia" {...field} />
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
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. ARB" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWard.isPending || updateWard.isPending}>
                {isEditing ? "Update" : "Add"} Ward
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
