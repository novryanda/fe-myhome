"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { MapPin, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { EmptyStateLarge } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

import { PageHero } from "../../_components/page-hero";
import { CityCard } from "./city-card";
import { CityDeleteDialog } from "./city-delete-dialog";
import { CityFormDialog } from "./city-form-dialog";
import type { City, CityFormValues } from "./city-types";

const getErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as AxiosError<{ errors?: string }>).response?.data?.errors;
  return message || fallback;
};

export default function CityPageClient() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [deletingCity, setDeletingCity] = useState<City | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, isRefetching } = useQuery({
    queryKey: ["cities", page, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), size: "12" });
      if (debouncedSearch) params.append("name", debouncedSearch);
      const res = await api.get(`/api/cities?${params}`);
      return res.data;
    },
  });

  const cities: City[] = data?.data || [];
  const paging = data?.paging;

  const createMutation = useMutation({
    mutationFn: async (values: CityFormValues) => {
      const payload = { name: values.name, photoUrl: values.photoUrl || undefined };
      const res = await api.post("/api/cities", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Kota berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      closeForm();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Gagal menambahkan kota")),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CityFormValues }) => {
      const payload = { name: values.name, photoUrl: values.photoUrl || undefined };
      const res = await api.put(`/api/cities/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Kota berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      closeForm();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Gagal memperbarui kota")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/cities/${id}`);
    },
    onSuccess: () => {
      toast.success("Kota berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      setDeletingCity(null);
    },
    onError: (error) => toast.error(getErrorMessage(error, "Gagal menghapus kota")),
  });

  const openCreate = () => {
    setEditingCity(null);
    setIsFormOpen(true);
  };

  const openEdit = (city: City) => {
    setEditingCity(city);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCity(null);
  };

  const handleFormSubmit = (values: CityFormValues) => {
    if (editingCity) {
      updateMutation.mutate({ id: editingCity.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <>
      <PageHero
        title="Daftar Kota"
        description="Kelola kota yang tersedia untuk properti kos-kosan."
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Kota
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama kota..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {paging && (
          <Badge variant="secondary">
            {paging.total_page > 0 ? `Halaman ${paging.current_page} dari ${paging.total_page}` : "0 data"}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[
            "city-skeleton-1",
            "city-skeleton-2",
            "city-skeleton-3",
            "city-skeleton-4",
            "city-skeleton-5",
            "city-skeleton-6",
          ].map((key) => (
            <Skeleton key={key} className="h-[72px] rounded-xl" />
          ))}
        </div>
      ) : cities.length === 0 ? (
        <EmptyStateLarge
          title="Belum ada kota"
          description="Tambahkan kota pertama untuk mulai mengkategorikan properti berdasarkan lokasi."
          icon={MapPin}
          action={{
            children: "Tambah Kota Pertama",
            onClick: openCreate,
            actionType: "button",
            icon: "plus",
          }}
        />
      ) : (
        <div className={`space-y-3 transition-opacity ${isRefetching ? "opacity-50" : ""}`}>
          {cities.map((city) => (
            <CityCard key={city.id} city={city} onEdit={openEdit} onDelete={setDeletingCity} />
          ))}
        </div>
      )}

      {paging && paging.total_page > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <span className="text-muted-foreground text-sm">
            {paging.current_page} / {paging.total_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= paging.total_page}
            onClick={() => setPage((p) => p + 1)}
          >
            Selanjutnya
          </Button>
        </div>
      )}

      <CityFormDialog
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        editingCity={editingCity}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <CityDeleteDialog
        city={deletingCity}
        onClose={() => setDeletingCity(null)}
        onConfirm={(id) => deleteMutation.mutate(id)}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
