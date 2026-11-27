"use client";

import { useSyncExternalStore } from "react";

/**
 * "Hide completed" on /search: a per-browser preference (localStorage), off
 * by default. Shared across tabs via the storage event.
 */

const KEY = "animekun:search:hide-completed";
const CHANGE_EVENT = "animekun:search:hide-completed";

function read(): boolean {
    try {
        return window.localStorage.getItem(KEY) === "1";
    } catch {
        return false;
    }
}

function subscribe(onChange: () => void): () => void {
    window.addEventListener("storage", onChange);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(CHANGE_EVENT, onChange);
    };
}

function write(on: boolean): void {
    try {
        if (on) window.localStorage.setItem(KEY, "1");
        else window.localStorage.removeItem(KEY);
    } catch {
        // Storage blocked: the switch can't be remembered. Harmless.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useHideCompleted(): [boolean, (on: boolean) => void] {
    const on = useSyncExternalStore(subscribe, read, () => false);
    return [on, write];
}
