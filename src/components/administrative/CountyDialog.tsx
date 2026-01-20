import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateCounty, useUpdateCounty } from "@/hooks/useCounties";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
});

type FormData = z.infer<typeof formSchema>;

interface CountyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  county?: { id: string; name: string; code: string } | null;
}

export function CountyDialog({ open, onOpenChange, county }: CountyDialogProps) {
  const isEditing = !!county;
  const createCounty = useCreateCounty();
  const updateCounty = useUpdateCounty();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  });

  useEffect(() => {
    if (county) {
      form.reset({
        name: county.name,
        code: county.code,
      });
    } else {
      form.reset({
        name: "",
        code: "",
      });
    }
  }, [county, form]);

  const onSubmit = async (data: FormData) => {
    if (isEditing && county) {
      await updateCounty.mutateAsync({ id: county.id, name: data.name, code: data.code });
    } else {
      await createCounty.mutateAsync({ name: data.name, code: data.code });
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit County" : "Add County"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Mandera" {...field} />
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
                    <Input placeholder="e.g. MND" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCounty.isPending || updateCounty.isPending}>
                {isEditing ? "Update" : "Add"} County
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
