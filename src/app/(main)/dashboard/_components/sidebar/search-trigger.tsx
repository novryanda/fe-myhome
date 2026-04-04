"use client";

import { Search } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";

export function SearchTrigger() {
    return (
        <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-muted/50 rounded-lg border border-border/50 hover:border-border"
        >
            <Search className="h-4 w-4" />
            <span>Search...</span>
            <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
        </button>
    );
}
