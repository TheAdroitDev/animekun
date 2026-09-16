"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { getCurrentSeason } from "@/lib/utils/get-current-season";
import type { Anime } from "@/modules/anime/types";
import type { ApiResponseType } from "@/types/api";

export type { CurrentSeason } from "@/lib/utils/get-current-season";
export { getCurrentSeason };

async function fetchSeasonal(season: string, year: number): Promise<Anime[]> {
    const { data } = await api.get<ApiResponseType<Anime[]>>(
        `/anime?type=seasonal&season=${season}&year=${year}`,
    );

    if (!data.success) {
        throw new Error(data.error);
    }

    return data.data;
}

export function useSeasonal(season: string, year: number) {
    return useQuery({
        queryKey: ["anime", "seasonal", season, year],
        queryFn: () => fetchSeasonal(season, year),
        staleTime: 5 * 60 * 1000,
    });
}

