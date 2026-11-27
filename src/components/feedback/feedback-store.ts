/**
 * Browser-only state for the 目安箱 feedback card. Nothing here touches the
 * server: it decides *when* the card may pop up, so public pages stay static.
 *
 * - localStorage `animekun:feedback:v1`: { sentAt?, snoozeUntil? }. Bump the
 *   version to ask everyone again (e.g. after a big release).
 * - sessionStorage: page-view count and "already popped up this visit".
 */

const STORAGE_KEY = "animekun:feedback:v1";
const VIEWS_KEY = "animekun:feedback:views";
const SHOWN_KEY = "animekun:feedback:shown";

/** Window events: a "good moment" happened, or the user asked for the card. */
export const FEEDBACK_MOMENT_EVENT = "animekun:feedback:moment";
export const FEEDBACK_OPEN_EVENT = "animekun:feedback:open";

const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

/** Pop up once this many pages have been viewed in one visit. */
export const VIEWS_BEFORE_PROMPT = 3;

/** No pop-up here: sign-in, admin, and /bookmarks (its Undo toasts and the
 *  ramen bowl sit at the bottom of the screen). The footer link still works. */
const EXCLUDED_PREFIXES = ["/auth", "/admin", "/bookmarks"];

interface StoredState {
    sentAt?: number;
    snoozeUntil?: number;
}

function now(): number {
    return Date.now();
}

function readState(): StoredState {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as StoredState) : {};
    } catch {
        return {};
    }
}

function writeState(state: StoredState): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Storage blocked: the card may pop up again next visit. Harmless.
    }
}

function readSession(key: string): string | null {
    try {
        return window.sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeSession(key: string, value: string): void {
    try {
        window.sessionStorage.setItem(key, value);
    } catch {
        // ignore
    }
}

/** Counts one page view in this visit and returns the new total. */
export function countPageView(): number {
    const views = Number(readSession(VIEWS_KEY) ?? "0") + 1;
    writeSession(VIEWS_KEY, String(views));
    return views;
}

/** May the card pop up on its own right now (not asked for by the user)? */
export function canAutoPrompt(pathname: string): boolean {
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return false;
    if (readSession(SHOWN_KEY)) return false;
    const { sentAt, snoozeUntil } = readState();
    if (sentAt) return false;
    if (snoozeUntil && snoozeUntil > now()) return false;
    // Never on top of an open dialog (search palette, drawer, confirm…).
    if (document.querySelector('[aria-modal="true"]')) return false;
    return true;
}

export function markShown(): void {
    writeSession(SHOWN_KEY, "1");
}

/** Closed without sending: don't pop up again for 30 days. */
export function snooze(): void {
    writeState({ ...readState(), snoozeUntil: now() + SNOOZE_MS });
}

export function markSent(): void {
    writeState({ ...readState(), sentAt: now() });
}

/** Call after something good happened (e.g. AI results revealed). */
export function signalFeedbackMoment(): void {
    window.dispatchEvent(new Event(FEEDBACK_MOMENT_EVENT));
}

/** Open the card because the user asked (footer link). */
export function openFeedback(): void {
    window.dispatchEvent(new Event(FEEDBACK_OPEN_EVENT));
}
