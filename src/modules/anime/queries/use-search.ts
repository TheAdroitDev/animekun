"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { searchParamsSchema } from "@/modules/anime/validations/search-schema";
import type { Anime, PaginatedResponse, SearchParams } from "@/modules/anime/types";
import type { ApiResponseType } from "@/types/api";

export type { SearchParams };

async function fetchSearch(params: SearchParams): Promise<PaginatedResponse<Anime>> {
    const validation = searchParamsSchema.safeParse(params);
    if (!validation.success) {
        const errorMsg =
            validation.error.issues[0]?.message ?? "Invalid search parameters";
        throw new Error(`Search validation failed: ${errorMsg}`);
    }
    const safeParams = validation.data;

    const searchParams = new URLSearchParams();

    if (safeParams.query?.trim()) {
        searchParams.set("q", safeParams.query.trim());
    }

    if (safeParams.genreIds && safeParams.genreIds.length > 0) {
        searchParams.set("genre", safeParams.genreIds.join(","));
    }

    if (safeParams.year) {
        searchParams.set("year", String(safeParams.year));
    }

    if (safeParams.status) {
        searchParams.set("status", safeParams.status);
    }

    if (safeParams.page && safeParams.page > 1) {
        searchParams.set("page", String(safeParams.page));
    }

    if (safeParams.limit) {
        searchParams.set("limit", String(safeParams.limit));
    }

    if (safeParams.sort) {
        searchParams.set("sort", safeParams.sort);
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

export function useSearch(
    params: SearchParams = {},
    debounceDelay = 350,
    options?: { enabled?: boolean },
) {
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
        enabled: options?.enabled ?? true,
        placeholderData: keepPreviousData,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}
