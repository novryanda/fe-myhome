"use client";

import * as React from "react";
import {
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
} from "@tanstack/react-table";
import { Plus, Search, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { getColumns, User, UserFormModal, SectionCards } from "./_components";
import { useSession } from "@/lib/auth-client";
import { ShieldAlert, Users } from "lucide-react";
import { EmptyStateLarge } from "@/components/empty-state";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { PageHero } from "../_components/page-hero";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UserPage() {
    const { data: session, isPending } = useSession();
    const queryClient = useQueryClient();

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [searchInput, setSearchInput] = React.useState("");
    const [debouncedSearch, setDebouncedSearch] = React.useState("");

    // Pagination state
    const [{ pageIndex, pageSize }, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const pagination = React.useMemo(
        () => ({
            pageIndex,
            pageSize,
        }),
        [pageIndex, pageSize]
    );

    React.useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
        }, 180);

        return () => window.clearTimeout(timeout);
    }, [searchInput]);

    React.useEffect(() => {
        setPagination(prev => (
            prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }
        ));
    }, [debouncedSearch]);

    // Using useQuery instead of manual state/useEffect
    const { data: userResponse, isLoading: isTableLoading, isFetching } = useQuery<{ data: User[], paging: any }>({
        queryKey: ["users", pageIndex, pageSize, debouncedSearch],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams({
                page: (pageIndex + 1).toString(),
                size: pageSize.toString(),
                search: debouncedSearch,
            });
            const response = await fetch(`/api/user?${params.toString()}`, { signal });
            if (!response.ok) throw new Error("Gagal mengambil data pengguna");
            return response.json();
        },
        enabled: !isPending && session?.user?.role === "SUPERADMIN",
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });

    const data = userResponse?.data || [];
    const totalPages = userResponse?.paging?.total_page || 0;
    const normalizedSearch = searchInput.trim().toLowerCase();
    const isSearchSyncing = normalizedSearch !== debouncedSearch.toLowerCase();
    const visibleData = React.useMemo(() => {
        if (!normalizedSearch) {
            return data;
        }

        return data.filter((user) => {
            const haystack = [user.name, user.email, user.role]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return haystack.includes(normalizedSearch);
        });
    }, [data, normalizedSearch]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<User | undefined>(undefined);
    const [userToDelete, setUserToDelete] = React.useState<User | undefined>(undefined);
    const [userToSuspend, setUserToSuspend] = React.useState<User | undefined>(undefined);
    const [userToUnban, setUserToUnban] = React.useState<User | undefined>(undefined);
    const [banReason, setBanReason] = React.useState("");

    const handleCreate = () => {
        setSelectedUser(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const confirmDelete = (user: User) => {
        setUserToDelete(user);
    };

    const handleSuspend = (user: User) => {
        setUserToSuspend(user);
        setBanReason("");
    };

    const handleUnban = (user: User) => {
        setUserToUnban(user);
    };

    const executeSuspend = async () => {
        if (!userToSuspend || !banReason) return;
        try {
            const response = await fetch(`/api/user/${userToSuspend.id}/ban`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: banReason }),
            });
            if (response.ok) {
                toast.success(`Pengguna ${userToSuspend.name} ditangguhkan`);
                // Auto-refresh: Invalidate stats and list
                queryClient.invalidateQueries({ queryKey: ["user-stats"] });
                queryClient.invalidateQueries({ queryKey: ["users"] });
            } else {
                toast.error("Gagal menangguhkan pengguna");
            }
        } catch (error) {
            toast.error("Terjadi kesalahan saat menangguhkan pengguna");
        } finally {
            setUserToSuspend(undefined);
            setBanReason("");
        }
    };

    const executeUnban = async () => {
        if (!userToUnban) return;
        try {
            const response = await fetch(`/api/user/${userToUnban.id}/unban`, {
                method: "POST",
            });
            if (response.ok) {
                toast.success(`Pengguna ${userToUnban.name} diaktifkan kembali`);
                // Auto-refresh: Invalidate stats and list
                queryClient.invalidateQueries({ queryKey: ["user-stats"] });
                queryClient.invalidateQueries({ queryKey: ["users"] });
            } else {
                toast.error("Gagal mengaktifkan kembali pengguna");
            }
        } catch (error) {
            toast.error("Terjadi kesalahan saat mengaktifkan kembali pengguna");
        } finally {
            setUserToUnban(undefined);
        }
    };

    const executeDelete = async () => {
        if (!userToDelete) return;
        try {
            const response = await fetch(`/api/user/${userToDelete.id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                toast.success("Pengguna berhasil dihapus");
                // Auto-refresh: Invalidate stats and list
                queryClient.invalidateQueries({ queryKey: ["user-stats"] });
                queryClient.invalidateQueries({ queryKey: ["users"] });
            } else {
                toast.error("Gagal menghapus pengguna");
            }
        } catch (error) {
            toast.error("Terjadi kesalahan saat menghapus pengguna");
        } finally {
            setUserToDelete(undefined);
        }
    };

    const handleFormSubmit = async (values: any) => {
        const isEdit = !!selectedUser;
        const url = isEdit ? `/api/user/${selectedUser.id}` : "/api/user";
        const method = isEdit ? "PATCH" : "POST";

        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(values),
        });

        if (response.ok) {
            toast.success(isEdit ? "Pengguna berhasil diperbarui" : "Pengguna berhasil ditambahkan");
            // Auto-refresh: Invalidate stats and list
            queryClient.invalidateQueries({ queryKey: ["user-stats"] });
            queryClient.invalidateQueries({ queryKey: ["users"] });
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || "Gagal menyimpan pengguna");
        }
    };

    const columns = React.useMemo(() => getColumns({
        onEdit: handleEdit,
        onDelete: confirmDelete,
        onSuspend: handleSuspend,
        onUnban: handleUnban
    }), [handleEdit, confirmDelete, handleSuspend, handleUnban]);



    const table = useReactTable({
        data: visibleData,
        columns,
        pageCount: totalPages,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        onPaginationChange: setPagination,
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination,
        },
    });

    if (isPending || isTableLoading) {
        return (
            <div className="flex h-[calc(100vh-theme(spacing.24))] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (session?.user?.role !== "SUPERADMIN") {
        return (
            <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col items-center justify-center space-y-4">
                <div className="rounded-full bg-destructive/10 p-4">
                    <ShieldAlert className="h-12 w-12 text-destructive" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Akses Dibatasi</h2>
                    <p className="text-muted-foreground">
                        Hanya Superadmin yang memiliki akses ke halaman manajemen user.
                    </p>
                </div>
                <Button variant="outline" onClick={() => window.history.back()}>
                    Kembali
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4 p-8">
            <PageHero
                title="Manajemen Pengguna"
                description="Kelola pengguna aplikasi dan peran mereka."
                action={
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Tambah Pengguna
                    </Button>
                }
            />

            <SectionCards />

            <div className="flex items-center py-4 justify-between gap-4">
                <div className="relative w-full max-w-sm group">
                    {isFetching || isSearchSyncing ? (
                        <RefreshCcw className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                    ) : (
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary" />
                    )}
                    <Input
                        placeholder="Cari nama, email, atau role user..."
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        className="pl-10"
                    />
                </div>
                <DataTableViewOptions table={table} />
            </div>

            {visibleData.length === 0 ? (
                <EmptyStateLarge
                    title={normalizedSearch ? "Pengguna tidak ditemukan" : "Belum ada pengguna"}
                    description={
                        normalizedSearch
                            ? `Tidak ada hasil yang cocok untuk "${searchInput.trim()}".`
                            : "Belum ada pengguna yang terdaftar di sistem. Mulailah dengan menambahkan pengguna baru atau undang tim Anda."
                    }
                    icon={Users}
                    action={{
                        children: normalizedSearch ? "Reset Pencarian" : "Tambah Pengguna Pertama",
                        onClick: normalizedSearch ? () => setSearchInput("") : handleCreate,
                        icon: normalizedSearch ? undefined : "plus"
                    }}
                    link={{
                        href: "#",
                        label: normalizedSearch ? "Coba kata kunci lain" : "Pelajari tentang manajemen peran"
                    }}
                />
            ) : (
                <>
                    <div className={cn("rounded-md border", (isFetching || isSearchSyncing) && "ring-1 ring-primary/10")}>
                        <DataTable table={table} columns={columns} />
                    </div>

                    <DataTablePagination table={table} />
                </>
            )}

            <UserFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleFormSubmit}
                initialData={selectedUser ? {
                    name: selectedUser.name,
                    email: selectedUser.email,
                    role: selectedUser.role as any,
                } : undefined}
                title={selectedUser ? "Ubah Pengguna" : "Tambah Pengguna"}
                description={selectedUser ? "Perbarui informasi dan peran pengguna." : "Tambahkan pengguna baru ke sistem."}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(undefined)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus akun <span className="font-semibold">{userToDelete?.name}</span> secara permanen dari server.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Suspend Confirmation & Reason */}
            <AlertDialog open={!!userToSuspend} onOpenChange={(open) => !open && setUserToSuspend(undefined)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tangguhkan Pengguna</AlertDialogTitle>
                        <AlertDialogDescription>
                            Akun <span className="font-semibold">{userToSuspend?.name}</span> akan dinonaktifkan sementara. Pengguna tidak akan bisa masuk ke aplikasi.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-2">
                        <label className="text-sm font-medium">Alasan Penangguhan</label>
                        <Input
                            placeholder="Contoh: Melanggar ketentuan layanan"
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={executeSuspend}
                            disabled={!banReason}
                            className="bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                            Konfirmasi Tangguhkan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Unban Confirmation */}
            <AlertDialog open={!!userToUnban} onOpenChange={(open) => !open && setUserToUnban(undefined)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Aktifkan Kembali Pengguna</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin mengaktifkan kembali akun <span className="font-semibold">{userToUnban?.name}</span>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={executeUnban} className="bg-emerald-600 text-white hover:bg-emerald-700">
                            Aktifkan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
