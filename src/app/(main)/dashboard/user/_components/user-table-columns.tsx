"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, SquarePen, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
    banned?: boolean;
    banReason?: string;
    banExpires?: string;
    createdAt: string;
};

interface ColumnProps {
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
    onSuspend: (user: User) => void;
    onUnban: (user: User) => void;
}

export const getColumns = ({ onEdit, onDelete, onSuspend, onUnban }: ColumnProps): ColumnDef<User>[] => [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Nama" />,
        cell: ({ row }) => {
            const user = row.original;
            const fallback = user.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("") || "U";

            return (
                <div className="flex items-center gap-3">
                    <Avatar className="size-9 border border-border/70">
                        <AvatarImage src={user.image ?? undefined} alt={user.name} />
                        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                            {fallback}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{user.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "email",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => <div className="truncate text-sm text-muted-foreground">{row.getValue("email")}</div>,
    },
    {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
            const banned = row.original.banned;
            return (
                <Badge variant={banned ? "destructive" : "success" as any} className={banned ? "" : "bg-emerald-500 hover:bg-emerald-600 text-white border-none"}>
                    {banned ? "Ditangguhkan" : "Aktif"}
                </Badge>
            );
        },
    },
    {
        accessorKey: "role",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Peran" />,
        cell: ({ row }) => {
            const role = row.getValue("role") as string;
            return (
                <Badge variant={role === "SUPERADMIN" ? "default" : role === "ADMIN" ? "secondary" : "outline"}>
                    {role}
                </Badge>
            );
        },
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Dibuat Pada" />,
        cell: ({ row }) => {
            return new Date(row.getValue("createdAt")).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const user = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            < MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                            <SquarePen className="mr-2 h-4 w-4" /> Ubah Pengguna
                        </DropdownMenuItem>
                        {user.banned ? (
                            <DropdownMenuItem onClick={() => onUnban(user)}>
                                <MoreHorizontal className="mr-2 h-4 w-4" /> Aktifkan Kembali
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={() => onSuspend(user)} className="text-amber-600">
                                <ShieldAlert className="mr-2 h-4 w-4" /> Tangguhkan
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus Pengguna
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
