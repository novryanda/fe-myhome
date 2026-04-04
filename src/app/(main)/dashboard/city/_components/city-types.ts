import { z } from "zod";

export interface City {
    id: string;
    name: string;
    photoUrl: string | null;
    _count?: { properties: number };
    createdAt: string;
}

export const cityFormSchema = z.object({
    name: z.string().min(1, "Nama kota wajib diisi").max(100),
    photoUrl: z.string().url("URL foto tidak valid").optional().or(z.literal("")),
});

export type CityFormValues = z.infer<typeof cityFormSchema>;
