"use client";

import Link from "next/link";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EntityCardProps {
    id: string;
    name: string;
    label: string;
    imageUrl?: string | null;
    href: string;
    fallbackIcon: React.ReactNode;
}

export function EntityCard({ id, name, label, imageUrl, href, fallbackIcon }: EntityCardProps) {
    return (
        <div className="flex items-center gap-6 rounded-2xl border border-emerald-100 bg-emerald-50/30 px-5 py-4 transition-all hover:shadow-md">
            <div className="size-16 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm">
                {imageUrl ? (
                    <img src={imageUrl} alt={name} className="size-full object-cover" />
                ) : (
                    <div className="flex size-full items-center justify-center bg-muted text-muted-foreground/40">
                        {fallbackIcon}
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-emerald-700/70">
                    <span className="[&>svg]:size-3.5">{fallbackIcon}</span>
                    <span className="text-xs font-medium">{label}</span>
                </div>
                <h3 className="mt-0.5 truncate text-base font-bold text-gray-800">{name}</h3>
            </div>

            <div className="hidden min-w-0 flex-1 sm:block">
                <div className="flex items-center gap-1.5 text-emerald-700/70">
                    <Copy className="size-3.5" />
                    <span className="text-xs font-medium">UUID</span>
                </div>
                <p className="mt-0.5 truncate font-mono text-sm font-semibold text-gray-800">{id}</p>
            </div>

            <Link href={href}>
                <Button  className="shrink-0 rounded-xl px-6 py-2.5 text-sm font-semibold text-white">
                    Kelola
                </Button>
            </Link>
        </div>
    );
}
