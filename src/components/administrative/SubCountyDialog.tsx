import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSubCounty, useUpdateSubCounty } from "@/hooks/useSubCountiesManagement";
import { useCounties } from "@/hooks/useCounties";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  county_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SubCountyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subCounty?: { id: string; name: string; code: string; county_id: string | null } | null;
}

export function SubCountyDialog({ open, onOpenChange, subCounty }: SubCountyDialogProps) {
  const isEditing = !!subCounty;
  const createSubCounty = useCreateSubCounty();
  const updateSubCounty = useUpdateSubCounty();
  const { data: counties } = useCounties();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      county_id: undefined,
    },
  });

  useEffect(() => {
    if (subCounty) {
      form.reset({
        name: subCounty.name,
        code: subCounty.code,
        county_id: subCounty.county_id || undefined,
      });
    } else {
      form.reset({
        name: "",
        code: "",
        county_id: undefined,
      });
    }
  }, [subCounty, form]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      code: data.code,
      county_id: data.county_id || null,
    };

    if (isEditing && subCounty) {
      await updateSubCounty.mutateAsync({ id: subCounty.id, ...payload });
    } else {
      await createSubCounty.mutateAsync(payload);
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Sub-County" : "Add Sub-County"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="county_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>County</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select county" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {counties?.map((county) => (
                        <SelectItem key={county.id} value={county.id}>
                          {county.name}
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
                    <Input placeholder="e.g. Mandera East" {...field} />
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
                    <Input placeholder="e.g. MND-E" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSubCounty.isPending || updateSubCounty.isPending}>
                {isEditing ? "Update" : "Add"} Sub-County
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
