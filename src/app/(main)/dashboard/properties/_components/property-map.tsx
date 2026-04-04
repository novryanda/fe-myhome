"use client";

import { useState, useEffect, useRef } from "react";
import {
    Map,
    type MapRef,
    MapMarker,
    MarkerContent,
    MarkerLabel,
    MarkerPopup
} from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, Navigation, Clock, ExternalLink, MapIcon, Layers } from "lucide-react";
import Image from "next/image";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

const styles = {
    default: {
        light: undefined,
        dark: "https://tiles.openfreemap.org/styles/dark"
    },
    openstreetmap: {
        light: "https://tiles.openfreemap.org/styles/bright",
        dark: "https://tiles.openfreemap.org/styles/dark"
    },
    openstreetmap3d: {
        light: "https://tiles.openfreemap.org/styles/liberty",
        dark: "https://tiles.openfreemap.org/styles/liberty"
    },
};

type StyleKey = keyof typeof styles;

interface PropertyMapProps {
    properties: any[];
}

export function PropertyMap({ properties }: PropertyMapProps) {
    const mapRef = useRef<MapRef>(null);
    const resolvedThemeMode = usePreferencesStore((s) => s.resolvedThemeMode);
    const [style, setStyle] = useState<StyleKey>("openstreetmap");

    const selectedStyle = styles[style];
    const is3D = style === "openstreetmap3d";

    useEffect(() => {
        mapRef.current?.easeTo({ pitch: is3D ? 60 : 0, duration: 500 });
    }, [is3D]);

    // Default center to Indonesia if no properties, else average of properties
    const validCoords = properties.filter(p => p.latitude && p.longitude);
    const center: [number, number] = validCoords.length > 0
        ? [validCoords[0].longitude, validCoords[0].latitude]
        : [113.9213, -0.7893]; // Center of Indonesia

    // Resolve current style based on theme
    const currentStyleUrl = resolvedThemeMode === "dark"
        ? selectedStyle.dark
        : selectedStyle.light;

    return (
        <Card className="h-[500px] relative w-full overflow-hidden border-none shadow-lg">
            <Map
                ref={mapRef}
                center={center}
                zoom={validCoords.length > 0 ? 12 : 5}
                styles={
                    currentStyleUrl
                        ? { light: currentStyleUrl, dark: currentStyleUrl }
                        : undefined
                }
            >
                {validCoords.map((property) => (
                    <MapMarker
                        key={property.id}
                        longitude={property.longitude}
                        latitude={property.latitude}
                    >
                        <MarkerContent>
                            <div className="group relative">
                                <div className="size-6 rounded-full bg-primary border-2 border-white dark:border-zinc-950 shadow-xl cursor-pointer hover:scale-125 transition-all flex items-center justify-center">
                                    <div className="size-2 rounded-full bg-white dark:bg-zinc-950" />
                                </div>
                                <MarkerLabel position="bottom" className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm text-[10px] font-bold border dark:border-zinc-800">
                                    {property.name}
                                </MarkerLabel>
                            </div>
                        </MarkerContent>
                        <MarkerPopup className="p-0 w-64 overflow-hidden border-none shadow-2xl dark:bg-zinc-950 antialiased">
                            <div className="relative h-36 overflow-hidden bg-muted">
                                {property.images && property.images.length > 0 ? (
                                    <img
                                        src={property.images[0].url}
                                        alt={property.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Layers className="h-10 w-10 opacity-20" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <div className="bg-primary px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm">
                                        {property.status === 'APPROVED' ? 'Aktif' :
                                            property.status === 'PENDING' ? 'Menunggu' : 'Ditolak'}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2 p-4">
                                <div>
                                    <h3 className="font-bold text-foreground leading-tight text-base">
                                        {property.name}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center">
                                        <Layers className="size-3 mr-1" />
                                        {property.address}
                                    </p>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        className="flex-1 h-9 text-xs font-bold"
                                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`, '_blank')}
                                    >
                                        <Navigation className="size-3.5 mr-2" />
                                        Petunjuk Arah
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-9 px-3"
                                        asChild
                                    >
                                        <a href={`/dashboard/properties/${property.id}`}>
                                            <ExternalLink className="size-3.5" />
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </MarkerPopup>
                    </MapMarker>
                ))}
            </Map>
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-1 rounded-lg border dark:border-zinc-800 shadow-lg">
                <div className="flex items-center px-2 py-1 gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-r dark:border-zinc-800 mr-1">
                    <Layers className="size-3" />
                    Gaya Peta
                </div>
                <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as StyleKey)}
                    className="bg-transparent text-foreground font-bold cursor:pointer focus:outline-none py-1.5 px-2 text-xs"
                >
                    <option value="default" className="dark:bg-zinc-900">Peta Standar</option>
                    <option value="openstreetmap" className="dark:bg-zinc-900">OpenStreetMap</option>
                    <option value="openstreetmap3d" className="dark:bg-zinc-900">Mode 3D</option>
                </select>
            </div>
        </Card>
    );
}
