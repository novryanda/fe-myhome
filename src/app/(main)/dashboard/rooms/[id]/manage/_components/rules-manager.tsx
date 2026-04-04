"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_SUGGESTIONS = [
    "Dilarang Bawa Hewan",
    "Dilarang Merokok",
    "Akses 24 Jam",
    "Maksimal 1 Orang/Kamar",
    "Maksimal 2 Orang/Kamar",
    "Tamu Lawan Jenis Dilarang Masuk",
];

interface Rule {
    id: string;
    name: string;
    description?: string | null;
}

interface RulesManagerProps {
    roomTypeId: string;
    initialRules: Rule[];
}

export function RulesManager({ roomTypeId, initialRules }: RulesManagerProps) {
    const queryClient = useQueryClient();
    const [newRule, setNewRule] = useState("");
    const [rules, setRules] = useState<Rule[]>(initialRules);

    const addMutation = useMutation({
        mutationFn: async (name: string) => {
            const res = await api.post(`/api/room-types/${roomTypeId}/rules`, { name });
            return res.data;
        },
        onSuccess: (data) => {
            const created = data.data;
            setRules((prev) => [...prev, created]);
            setNewRule("");
            toast.success("Aturan berhasil ditambahkan");
            queryClient.invalidateQueries({ queryKey: ["room-type", roomTypeId] });
        },
        onError: (err: any) =>
            toast.error(err.response?.data?.message || "Gagal menambahkan aturan"),
    });

    const deleteMutation = useMutation({
        mutationFn: async (ruleId: string) => {
            await api.delete(`/api/room-types/rules/${ruleId}`);
            return ruleId;
        },
        onSuccess: (ruleId) => {
            setRules((prev) => prev.filter((r) => r.id !== ruleId));
            toast.success("Aturan berhasil dihapus");
            queryClient.invalidateQueries({ queryKey: ["room-type", roomTypeId] });
        },
        onError: (err: any) =>
            toast.error(err.response?.data?.message || "Gagal menghapus aturan"),
    });

    const handleAdd = () => {
        const trimmed = newRule.trim();
        if (!trimmed) return;
        if (rules.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) {
            toast.error("Aturan sudah ada");
            return;
        }
        addMutation.mutate(trimmed);
    };

    const handleSuggestionClick = (name: string) => {
        if (rules.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
            // Already exists — remove it
            const existing = rules.find(
                (r) => r.name.toLowerCase() === name.toLowerCase()
            );
            if (existing) deleteMutation.mutate(existing.id);
        } else {
            addMutation.mutate(name);
        }
    };

    const isSelected = (name: string) =>
        rules.some((r) => r.name.toLowerCase() === name.toLowerCase());

    return (
        <div className="space-y-6">
            {/* Add new rule */}
            <div className="flex gap-3">
                <Input
                    placeholder="Tambahkan aturan baru..."
                    className="rounded-xl flex-1"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleAdd();
                        }
                    }}
                />
                <Button
                    onClick={handleAdd}
                    disabled={addMutation.isPending || !newRule.trim()}
                >
                    {addMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Plus className="size-4" />
                    )}
                    Tambah Aturan
                </Button>
            </div>

            {/* Suggestion chips */}
            <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                    Pilih aturan umum atau tambahkan sendiri:
                </p>
                <div className="flex flex-wrap gap-2">
                    {DEFAULT_SUGGESTIONS.map((suggestion) => {
                        const selected = isSelected(suggestion);
                        return (
                            <button
                                key={suggestion}
                                type="button"
                                onClick={() => handleSuggestionClick(suggestion)}
                                disabled={addMutation.isPending || deleteMutation.isPending}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all
                                    ${
                                        selected
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                            : "border-border bg-background text-muted-foreground hover:border-emerald-200 hover:bg-emerald-50/50"
                                    }`}
                            >
                                {selected ? (
                                    <X className="size-3.5" />
                                ) : (
                                    <Plus className="size-3.5" />
                                )}
                                {suggestion}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Custom rules (those not in suggestions) */}
            {rules.filter(
                (r) =>
                    !DEFAULT_SUGGESTIONS.some(
                        (s) => s.toLowerCase() === r.name.toLowerCase()
                    )
            ).length > 0 && (
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">
                        Aturan kustom:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {rules
                            .filter(
                                (r) =>
                                    !DEFAULT_SUGGESTIONS.some(
                                        (s) => s.toLowerCase() === r.name.toLowerCase()
                                    )
                            )
                            .map((rule) => (
                                <button
                                    key={rule.id}
                                    type="button"
                                    onClick={() => deleteMutation.mutate(rule.id)}
                                    disabled={deleteMutation.isPending}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition-all hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                                >
                                    <X className="size-3.5" />
                                    {rule.name}
                                </button>
                            ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {rules.length === 0 && (
                <div className="rounded-xl border-2 border-dashed py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                        Belum ada peraturan. Pilih dari saran atau tambahkan sendiri.
                    </p>
                </div>
            )}
        </div>
    );
}
