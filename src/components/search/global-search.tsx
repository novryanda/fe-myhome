"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Search, User, Home, Bed, Loader2 } from "lucide-react"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { useSession } from "@/lib/auth-client"

export function GlobalSearch() {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [debouncedQuery, setDebouncedQuery] = React.useState("")
    const router = useRouter()
    const { data: session } = useSession()

    // Handle shortcut Ctrl+K
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    // Debounce query
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query)
        }, 300)
        return () => clearTimeout(timer)
    }, [query])

    const { data, isFetching } = useQuery({
        queryKey: ["global-search", debouncedQuery],
        queryFn: async () => {
            if (debouncedQuery.length < 2) return null
            const { default: axios } = await import("@/lib/api").then(m => ({ default: m.api }))
            const res = await axios.get(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
            return res.data
        },
        enabled: debouncedQuery.length >= 2,
    })

    const onSelect = (url: string) => {
        setOpen(false)
        router.push(url)
    }

    if (!session?.user || (session.user.role !== "SUPERADMIN" && session.user.role !== "ADMIN")) {
        return null
    }

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
                placeholder="Cari pengguna, properti, atau kamar..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                {isFetching && (
                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sedang mencari...
                    </div>
                )}
                <CommandEmpty>Hasil tidak ditemukan.</CommandEmpty>

                {data?.users?.length > 0 && (
                    <CommandGroup heading="Pengguna">
                        {data.users.map((user: any) => (
                            <CommandItem
                                key={user.id}
                                onSelect={() => onSelect(`/dashboard/user`)}
                            >
                                <User className="mr-2 h-4 w-4" />
                                <span>{user.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{user.email}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {data?.properties?.length > 0 && (
                    <CommandGroup heading="Properti">
                        {data.properties.map((property: any) => (
                            <CommandItem
                                key={property.id}
                                onSelect={() => onSelect(`/dashboard/properties`)}
                            >
                                <Home className="mr-2 h-4 w-4" />
                                <span>{property.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{property.address}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {data?.roomTypes?.length > 0 && (
                    <CommandGroup heading="Tipe Kamar">
                        {data.roomTypes.map((room: any) => (
                            <CommandItem
                                key={room.id}
                                onSelect={() => onSelect(`/dashboard/rooms`)}
                            >
                                <Bed className="mr-2 h-4 w-4" />
                                <span>{room.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{room.property?.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    )
}
