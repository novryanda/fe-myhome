"use client";

import { Camera, Image as ImageIcon, LayoutGrid, Building2, Palmtree, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PropertyImage {
    url: string;
    category: "BUILDING" | "SHARED_FACILITY" | "PARKING";
}

interface PropertyGalleryProps {
    images: PropertyImage[];
    propertyName: string;
}

export function PropertyGallery({ images, propertyName }: PropertyGalleryProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

    if (!images || images.length === 0) {
        return (
            <div className="aspect-[21/9] w-full bg-muted rounded-xl flex flex-col items-center justify-center gap-3 border-2 border-dashed">
                <div className="size-16 rounded-full bg-background flex items-center justify-center shadow-sm">
                    <Camera className="size-8 text-muted-foreground opacity-20" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No photos available</p>
            </div>
        );
    }

    const filteredImages = selectedCategory === "ALL"
        ? images
        : images.filter(img => img.category === selectedCategory);

    const count = filteredImages.length;

    return (
        <div className="space-y-4">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="ALL" className="text-xs uppercase tracking-wider font-bold">Semua</TabsTrigger>
                    <TabsTrigger value="BUILDING" className="text-xs uppercase tracking-wider font-bold gap-2">
                        <Building2 className="size-3" /> Bangunan
                    </TabsTrigger>
                    <TabsTrigger value="SHARED_FACILITY" className="text-xs uppercase tracking-wider font-bold gap-2">
                        <Palmtree className="size-3" /> Fasilitas
                    </TabsTrigger>
                    <TabsTrigger value="PARKING" className="text-xs uppercase tracking-wider font-bold gap-2">
                        <Car className="size-3" /> Parkir
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="relative group overflow-hidden rounded-2xl shadow-xl border bg-background">
                {count === 0 ? (
                    <div className="h-[300px] md:h-[450px] flex flex-col items-center justify-center text-muted-foreground bg-muted/20 italic">
                        <ImageIcon className="size-10 opacity-20 mb-2" />
                        <p>Tidak ada foto untuk kategori ini</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[300px] md:h-[450px]">
                        {/* Main Large Image (Spans 3 columns) */}
                        <div className="md:col-span-3 relative h-full overflow-hidden">
                            <img
                                src={filteredImages[0].url}
                                alt={`${propertyName} - Main`}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                        </div>

                        {/* Side Stack */}
                        <div className="hidden md:flex md:col-span-1 flex-col gap-2 h-full">
                            {/* Top Right Small */}
                            <div className="flex-1 relative overflow-hidden">
                                {filteredImages[1] ? (
                                    <img
                                        src={filteredImages[1].url}
                                        alt={`${propertyName} - 2`}
                                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <ImageIcon className="size-6 text-muted-foreground opacity-20" />
                                    </div>
                                )}
                            </div>

                            {/* Bottom Right Small with Button Overlay */}
                            <div className="flex-1 relative overflow-hidden">
                                {filteredImages[2] ? (
                                    <>
                                        <img
                                            src={filteredImages[2].url}
                                            alt={`${propertyName} - 3`}
                                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                                        />
                                        {count > 3 && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <Button variant="secondary" size="sm" className="h-9 px-4 font-bold rounded-lg shadow-xl backdrop-blur-md bg-white/20 text-white border-white/30 hover:bg-white/40 transition-all">
                                                    <LayoutGrid className="size-4 mr-2" />
                                                    Lihat {count - 3}+ foto
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <ImageIcon className="size-6 text-muted-foreground opacity-20" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mobile Overlay */}
                        <div className="md:hidden absolute bottom-4 right-4 z-10">
                            <Button variant="secondary" size="sm" className="h-9 px-4 font-bold rounded-lg shadow-xl backdrop-blur-md bg-black/50 text-white border-white/10">
                                <LayoutGrid className="size-4 mr-2" />
                                1 / {count}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
