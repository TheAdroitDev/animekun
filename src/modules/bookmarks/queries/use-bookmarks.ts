"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { ROUTES } from "@/lib/constants/route";
import type { ApiResponseType } from "@/types/api";

import { moveBookmarkAction, reorderColumnAction } from "../actions/move-bookmark";
import { removeBookmarkAction } from "../actions/remove-bookmark";
import { setBookmarkStatusAction } from "../actions/set-bookmark-status";
import type { ActionError, ActionResult, Bookmark, BookmarkStatusMap } from "../types";
import type {
    MoveBookmarkInput,
    RemoveBookmarkInput,
    ReorderColumnInput,
    SetBookmarkStatusInput,
} from "../validations/bookmark-schema";

/** Thrown by the mutations when a Server Action returns { ok: false }. */
export class BookmarkActionError extends Error {
    readonly code: ActionError;

    constructor(code: ActionError) {
        super(`Bookmark action failed: ${code}`);
        this.name = "BookmarkActionError";
        this.code = code;
    }
}

// The user id is part of the key, so another account signing in on the
// same tab never sees the previous user's map.
const bookmarksKey = (userId: string | undefined) => ["bookmarks", userId] as const;

type MutationContext = { previous: BookmarkStatusMap | undefined };

async function fetchStatusMap(): Promise<BookmarkStatusMap> {
    const { data } = await api.get<ApiResponseType<BookmarkStatusMap>>(ROUTES.DASHBOARD.BOOKMARKS);
    if (!data.success) throw new Error(data.error);
    return data.data;
}

function unwrap<T>(result: ActionResult<T>): T {
    if (!result.ok) throw new BookmarkActionError(result.error);
    return result.data;
}

/**
 * The signed-in user's { animeId: status } map.
 * - Logged out: disabled, zero requests.
 * - Signed in: fetched once per page load. Our own mutations keep the cache
 *   right, so it never goes stale and never refetches on tab focus.
 *
 * Note: a disabled query stays "pending" in TanStack v5. Use `isLoading`
 * (pending AND fetching) for spinners, not `isPending`.
 */
export function useBookmarkStatuses({ enabled = true }: { enabled?: boolean } = {}) {
    const { data: session } = useSession();
    const userId = session?.user.id;

    return useQuery({
        queryKey: bookmarksKey(userId),
        queryFn: fetchStatusMap,
        // `enabled: false` lets a page skip the request until it needs the
        // map (e.g. /search only while "Hide completed" is on).
        enabled: !!userId && enabled,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });
}

/**
 * Add a bookmark or move it (optimistic).
 * Each write is one SQL statement, so the server's reply is the truth:
 * no refetch after success, only after an error (a network failure leaves
 * it unknown whether the write landed).
 */
export function useSetBookmarkStatus() {
    const queryClient = useQueryClient();
    const { data: session } = useSession();
    const key = bookmarksKey(session?.user.id);

    return useMutation<Bookmark, Error, SetBookmarkStatusInput, MutationContext>({
        mutationFn: async (input) => unwrap(await setBookmarkStatusAction(input)),

        onMutate: async (input) => {
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData<BookmarkStatusMap>(key);
            queryClient.setQueryData<BookmarkStatusMap>(key, (map) => ({
                ...map,
                [input.animeId]: input.status,
            }));
            return { previous };
        },

        onSuccess: (bookmark) => {
            queryClient.setQueryData<BookmarkStatusMap>(key, (map) => ({
                ...map,
                [bookmark.animeId]: bookmark.status,
            }));
        },

        onError: (_error, _input, context) => {
            if (context?.previous) queryClient.setQueryData(key, context.previous);
            void queryClient.invalidateQueries({ queryKey: key });
        },

        onSettled: (_data, error, _input, context) => {
            // The map wasn't loaded yet when the user clicked, so the cache
            // now holds only this one entry: load the full map.
            if (!error && !context?.previous) void queryClient.invalidateQueries({ queryKey: key });
        },
    });
}

/** Remove a bookmark (optimistic). Same refetch rules as useSetBookmarkStatus. */
export function useRemoveBookmark() {
    const queryClient = useQueryClient();
    const { data: session } = useSession();
    const key = bookmarksKey(session?.user.id);

    return useMutation<undefined, Error, RemoveBookmarkInput, MutationContext>({
        mutationFn: async (input) => unwrap(await removeBookmarkAction(input)),

        onMutate: async (input) => {
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData<BookmarkStatusMap>(key);
            queryClient.setQueryData<BookmarkStatusMap>(key, (map) => {
                if (!map) return map;
                const next = { ...map };
                delete next[input.animeId];
                return next;
            });
            return { previous };
        },

        onError: (_error, _input, context) => {
            if (context?.previous) queryClient.setQueryData(key, context.previous);
            void queryClient.invalidateQueries({ queryKey: key });
        },

        onSettled: (_data, error, _input, context) => {
            if (!error && !context?.previous) void queryClient.invalidateQueries({ queryKey: key });
        },
    });
}

/**
 * Board drag and drop: reorder or move a card (the board updates its own
 * list optimistically). Keeps the status map for the anime pages' button in
 * sync, with the same refetch rules as useSetBookmarkStatus.
 */
export function useMoveBookmark() {
    const queryClient = useQueryClient();
    const { data: session } = useSession();
    const key = bookmarksKey(session?.user.id);

    return useMutation<Bookmark, Error, MoveBookmarkInput, MutationContext>({
        mutationFn: async (input) => unwrap(await moveBookmarkAction(input)),

        onMutate: async (input) => {
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData<BookmarkStatusMap>(key);
            if (previous) queryClient.setQueryData<BookmarkStatusMap>(key, { ...previous, [input.animeId]: input.status });
            return { previous };
        },

        onError: (_error, _input, context) => {
            if (context?.previous) queryClient.setQueryData(key, context.previous);
            void queryClient.invalidateQueries({ queryKey: key });
        },
    });
}

/** Rare: renumber a column after a drop left no room between two cards. */
export function useReorderColumn() {
    return useMutation<undefined, Error, ReorderColumnInput>({
        mutationFn: async (input) => unwrap(await reorderColumnAction(input)),
    });
}
