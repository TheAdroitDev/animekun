"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Anime } from "@/modules/anime/types";
import type { ApiResponseType } from "@/types/api";

async function fetchTrending(): Promise<Anime[]> {
    const { data } = await api.get<ApiResponseType<Anime[]>>(
        "/anime?type=trending",
    );

    if (!data.success) {
        throw new Error(data.error);
    }

    return data.data;
}

export function useTrending() {
    return useQuery({
        queryKey: ["anime", "trending"],
        queryFn: fetchTrending,
        staleTime: 5 * 60 * 1000, // 5 minutes — provider also caches for 30 min
    });
}
