"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Anime } from "@/modules/anime/types";
import type { ApiResponseType } from "@/types/api";

async function fetchPopular(): Promise<Anime[]> {
    const { data } = await api.get<ApiResponseType<Anime[]>>(
        "/anime?type=popular",
    );

    if (!data.success) {
        throw new Error(data.error);
    }

    return data.data;
}

export function usePopular() {
    return useQuery({
        queryKey: ["anime", "popular"],
        queryFn: fetchPopular,
        staleTime: 5 * 60 * 1000,
    });
}
