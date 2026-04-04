import {
    BedDouble,
    Wind,
    Monitor,
    DoorClosed,
    Bath,
    ShowerHead,
    Droplets,
    CheckCircle2,
    Armchair,
    Tv,
    Fan,
    Wifi,
    Refrigerator,
    Sofa
} from "lucide-react";
import React from "react";

// Lucide doesn't have a specific Toilet/Closet icon that's standard, so we use Bath or generic ones
// or we can use specific mappings based on keywords.

export const getFacilityIcon = (facilityName: string) => {
    const name = facilityName.toLowerCase();

    // Bedroom Facilities
    if (name.includes("kasur") || name.includes("bed") || name.includes("springbed")) return BedDouble;
    if (name.includes("ac") || name.includes("pendingin")) return Wind;
    if (name.includes("lemari") || name.includes("wardrobe") || name.includes("storage")) return DoorClosed; // DoorClosed looks a bit like a wardrobe
    if (name.includes("meja") || name.includes("desk") || name.includes("table")) return Monitor; // often desks have monitors, or we can use generic
    if (name.includes("kursi") || name.includes("chair")) return Armchair;
    if (name.includes("tv") || name.includes("televisi")) return Tv;
    if (name.includes("kipas") || name.includes("fan")) return Fan;
    if (name.includes("wifi") || name.includes("internet")) return Wifi;
    if (name.includes("kulkas") || name.includes("refrigerator")) return Refrigerator;
    if (name.includes("sofa")) return Sofa;

    // Bathroom Facilities
    if (name.includes("kamar mandi dalam") || name.includes("ensuite")) return Bath;
    if (name.includes("kamar mandi luar") || name.includes("shared")) return Bath;
    if (name.includes("kloset duduk") || name.includes("toilet")) return Bath; // Bath is a good proxy for bathroom stuff
    if (name.includes("kloset jongkok")) return Bath;
    if (name.includes("shower") || name.includes("pancuran")) return ShowerHead;
    if (name.includes("water heater") || name.includes("air panas")) return Droplets; // Droplets/Flame could work
    if (name.includes("bak mandi") || name.includes("ember")) return Droplets;

    // Fallback
    return CheckCircle2;
};

interface FacilityItemProps {
    name: string;
    className?: string;
    iconClassName?: string;
}

export function FacilityItem({ name, className = "", iconClassName = "" }: FacilityItemProps) {
    const Icon = getFacilityIcon(name);

    return (
        <div className={`flex items-start gap-3 text-slate-700 ${className}`}>
            <Icon className={`w-5 h-5 text-slate-500 mt-0.5 shrink-0 ${iconClassName}`} />
            <span className="text-sm font-medium leading-tight pt-0.5">{name}</span>
        </div>
    );
}

// Optional component for rendering a grid of facilities
export function FacilityGrid({ facilities, title }: { facilities: string[], title: string }) {
    if (!facilities || facilities.length === 0) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {facilities.map((facility, idx) => (
                    <FacilityItem key={idx} name={facility} />
                ))}
            </div>
        </div>
    );
}
