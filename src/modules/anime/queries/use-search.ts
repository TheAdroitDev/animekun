"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import type { Anime, PaginatedResponse, SearchParams } from "@/modules/anime/types";
import type { ApiResponseType } from "@/types/api";

export type { SearchParams };

async function fetchSearch(params: SearchParams): Promise<PaginatedResponse<Anime>> {
    const searchParams = new URLSearchParams();

    if (params.query?.trim()) {
        searchParams.set("q", params.query.trim());
    }

    if (params.genreIds && params.genreIds.length > 0) {
        searchParams.set("genre", params.genreIds.join(","));
    }

    if (params.year) {
        searchParams.set("year", String(params.year));
    }

    if (params.status) {
        searchParams.set("status", params.status);
    }

    if (params.page && params.page > 1) {
        searchParams.set("page", String(params.page));
    }

    if (params.limit) {
        searchParams.set("limit", String(params.limit));
    }

    if (params.sort) {
        searchParams.set("sort", params.sort);
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/anime?${queryString}` : "/anime";

    const { data } = await api.get<ApiResponseType<PaginatedResponse<Anime>>>(endpoint);

    if (!data.success) {
        throw new Error(data.error);
    }

    return data.data;
}


// Custom TanStack Query hook for anime search & filtering.
// Automatically debounces search text input and keeps previous results
// while fetching fresh data to avoid jarring UI flickers.

export function useSearch(params: SearchParams = {}, debounceDelay = 350) {
    const debouncedQuery = useDebounce(params.query ?? "", debounceDelay);

    const activeParams: SearchParams = {
        ...params,
        query: debouncedQuery,
    };

    return useQuery({
        queryKey: [
            "anime",
            "search",
            {
                q: debouncedQuery,
                genreIds: params.genreIds?.slice().sort().join(","),
                year: params.year,
                status: params.status,
                sort: params.sort,
                page: params.page ?? 1,
                limit: params.limit ?? 25,
            },
        ],
        queryFn: () => fetchSearch(activeParams),
        placeholderData: keepPreviousData,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}
