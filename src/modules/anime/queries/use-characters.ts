"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { ROUTES } from "@/lib/constants/route";
import type { AnimeDetail, Character } from "@/modules/anime/types";
import type { ApiResponseType } from "@/types/api";

type AnimeWithCharacters = AnimeDetail & { characters: Character[] };

async function fetchCharacters(animeId: string): Promise<Character[]> {
    const { data } = await api.get<ApiResponseType<AnimeWithCharacters>>(
        `${ROUTES.ANIME_DETAIL(animeId)}?include=characters`,
    );

    if (!data.success) {
        throw new Error(data.error);
    }

    return data.data.characters;
}

export function useCharacters(animeId: string) {
    return useQuery({
        queryKey: ["anime", animeId, "characters"],
        queryFn: () => fetchCharacters(animeId),
        staleTime: 10 * 60 * 1000, // 10 minutes characters rarely change
    });
}
