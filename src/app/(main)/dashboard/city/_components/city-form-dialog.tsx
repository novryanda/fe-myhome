"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { ImageUpload } from "../../properties/_components/image-upload";
import { type City, type CityFormValues, cityFormSchema } from "./city-types";

interface CityFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CityFormValues) => void;
  editingCity: City | null;
  isPending: boolean;
}

export function CityFormDialog({ isOpen, onClose, onSubmit, editingCity, isPending }: CityFormDialogProps) {
  const form = useForm<CityFormValues>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: { name: "", photoUrl: "" },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: editingCity?.name || "",
        photoUrl: editingCity?.photoUrl || "",
      });
    }
  }, [isOpen, editingCity, form]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingCity ? "Edit Kota" : "Tambah Kota Baru"}</DialogTitle>
          <DialogDescription>
            {editingCity ? "Perbarui informasi kota." : "Isi data kota baru yang akan ditambahkan."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kota</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jakarta, Bandung, Yogyakarta" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Foto Kota</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <ImageUpload
                        value={field.value ? [field.value] : []}
                        onUpload={(urls) => field.onChange(urls[0] || "")}
                        onRemove={() => field.onChange("")}
                        maxImages={1}
                      />
                      <p className="text-muted-foreground text-xs">
                        Saat edit kota, Anda bisa upload gambar baru untuk mengganti foto yang lama.
                      </p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCity ? "Simpan Perubahan" : "Tambah Kota"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
