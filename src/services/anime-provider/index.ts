import { TenraiProvider } from "./tenrai";
import type { AnimeProvider } from "./provider";

// Swap from Tenrai to another implementation by changing this one line. Oppppp :)

// Single shared provider instance.
export const animeProvider: AnimeProvider = new TenraiProvider();
