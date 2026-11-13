"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * DateRangePicker — custom calendar popover for a "YYYY-MM-DD" range.
 *
 * - Click a start day, then an end day (picked backwards → swapped, so the
 *   range is never inverted). While picking the end, hovering previews it.
 * - Click the title to zoom out: days → months → years (anime spans decades).
 * - Presets: this season / this year / last year / 2010s / 2000s / 90s.
 * - Keyboard: arrows move by day/week, PageUp/PageDown by month
 *   (+Shift = year), Home/End = week start/end, Enter/Space pick, Esc closes.
 *
 * Dates stay plain "YYYY-MM-DD" strings; math uses UTC so there's no
 * timezone off-by-one. Styles: `.drp*` in globals.css.
 */

export interface DateRangeValue {
    startDate: string;
    endDate: string;
}

interface DateRangePickerProps extends DateRangeValue {
    onChange: (range: DateRangeValue) => void;
    /** id of the trigger button. */
    id?: string;
    /** id of the visible label (announced with the value). */
    labelId?: string;
    invalid?: boolean;
}

type View = "days" | "months" | "years";
type Slide = "" | "next" | "prev";

const MIN_YEAR = 1917; // earliest anime on MAL
const YEARS_PER_PAGE = 12;
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── String-based date helpers (UTC math, no timezone drift) ──

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const isIso = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

function parseIso(iso: string) {
    const [y, m, d] = iso.split("-").map(Number);
    return { y, m: m - 1, d };
}

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const weekdayOf = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).getUTCDay();

function fromUtc(date: Date) {
    return toIso(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function addDays(iso: string, n: number) {
    const { y, m, d } = parseIso(iso);
    return fromUtc(new Date(Date.UTC(y, m, d + n)));
}

function addMonths(iso: string, n: number) {
    const { y, m, d } = parseIso(iso);
    const target = new Date(Date.UTC(y, m + n, 1));
    const ty = target.getUTCFullYear();
    const tm = target.getUTCMonth();
    return toIso(ty, tm, Math.min(d, daysInMonth(ty, tm)));
}

function formatIso(iso: string) {
    const { y, m, d } = parseIso(iso);
    return `${MONTHS[m].slice(0, 3)} ${d}, ${y}`;
}

/** Local "today". Impure — call from event handlers only. */
function todayIso() {
    const now = new Date();
    return toIso(now.getFullYear(), now.getMonth(), now.getDate());
}

function buildPresets(today: string) {
    const { y, m } = parseIso(today);
    const s = Math.floor(m / 3) * 3; // anime seasons: Jan / Apr / Jul / Oct
    return [
        { label: "This season", start: toIso(y, s, 1), end: toIso(y, s + 2, daysInMonth(y, s + 2)) },
        { label: "This year", start: `${y}-01-01`, end: `${y}-12-31` },
        { label: "Last year", start: `${y - 1}-01-01`, end: `${y - 1}-12-31` },
        { label: "2010s", start: "2010-01-01", end: "2019-12-31" },
        { label: "2000s", start: "2000-01-01", end: "2009-12-31" },
        { label: "90s", start: "1990-01-01", end: "1999-12-31" },
    ];
}

function triggerLabel(start: string, end: string) {
    if (start && end) return `${formatIso(start)} – ${formatIso(end)}`;
    if (start) return `From ${formatIso(start)}`;
    if (end) return `Until ${formatIso(end)}`;
    return "Any date";
}

export function DateRangePicker({ startDate, endDate, onChange, id, labelId, invalid }: DateRangePickerProps) {
    const autoId = useId();
    const buttonId = id ?? `drp-${autoId}`;
    const panelId = `${buttonId}-panel`;

    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const focusDayRef = useRef(false);

    const [open, setOpen] = useState(false);
    const [today, setToday] = useState(""); // set on open, keeps render pure
    const [view, setView] = useState<View>("days");
    const [cursor, setCursor] = useState(""); // focused day; its month is the visible month
    const [selectingEnd, setSelectingEnd] = useState(false);
    const [hoverDate, setHoverDate] = useState("");
    const [slide, setSlide] = useState<Slide>("");

    const start = isIso(startDate) ? startDate : "";
    const end = isIso(endDate) ? endDate : "";

    const openPicker = () => {
        const now = todayIso();
        setToday(now);
        setCursor(start || end || now);
        setView("days");
        setSelectingEnd(Boolean(start && !end));
        setHoverDate("");
        setSlide("");
        focusDayRef.current = true;
        setOpen(true);
    };

    const close = (focusTrigger = true) => {
        setOpen(false);
        if (focusTrigger) buttonRef.current?.focus();
    };

    // Close on a click/tap outside
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    // Keyboard navigation in the grid moves real focus to the cursor day
    useEffect(() => {
        if (!open || view !== "days" || !focusDayRef.current) return;
        focusDayRef.current = false;
        gridRef.current
            ?.querySelector<HTMLButtonElement>(`[data-date="${cursor}"]`)
            ?.focus({ preventScroll: true });
    }, [open, view, cursor]);

    const maxYear = today ? parseIso(today).y + 5 : 2100;
    const minIso = `${MIN_YEAR}-01-01`;
    const maxIso = `${maxYear}-12-31`;
    const clampIso = (iso: string) => (iso < minIso ? minIso : iso > maxIso ? maxIso : iso);

    const { y: cy, m: cm } = cursor ? parseIso(cursor) : { y: MIN_YEAR, m: 0 };
    const pageStart = cy - ((cy - MIN_YEAR) % YEARS_PER_PAGE);

    const moveCursor = (iso: string) => {
        const next = clampIso(iso);
        if (next.slice(0, 7) !== cursor.slice(0, 7)) setSlide(next > cursor ? "next" : "prev");
        setCursor(next);
    };

    const shift = (dir: 1 | -1) => {
        const months = view === "days" ? 1 : view === "months" ? 12 : 12 * YEARS_PER_PAGE;
        moveCursor(addMonths(cursor, months * dir));
    };

    const canPrev = view === "years" ? pageStart > MIN_YEAR : view === "months" ? cy > MIN_YEAR : cursor.slice(0, 7) > minIso.slice(0, 7);
    const canNext = view === "years" ? pageStart + YEARS_PER_PAGE <= maxYear : view === "months" ? cy < maxYear : cursor.slice(0, 7) < maxIso.slice(0, 7);

    const pickDay = (iso: string) => {
        setCursor(iso);
        if (!selectingEnd || !start) {
            onChange({ startDate: iso, endDate: "" });
            setSelectingEnd(true);
            return;
        }
        const [a, b] = iso < start ? [iso, start] : [start, iso];
        onChange({ startDate: a, endDate: b });
        setSelectingEnd(false);
        setHoverDate("");
    };

    const applyPreset = (presetStart: string, presetEnd: string) => {
        onChange({ startDate: presetStart, endDate: presetEnd });
        setSelectingEnd(false);
        setHoverDate("");
        setView("days");
        moveCursor(presetStart);
    };

    const clear = () => {
        onChange({ startDate: "", endDate: "" });
        setSelectingEnd(false);
        setHoverDate("");
    };

    const handlePanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            close();
        }
    };

    const handleGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const { y, m, d } = parseIso(cursor);
        const weekday = weekdayOf(y, m, d);
        const moves: Record<string, () => string> = {
            ArrowLeft: () => addDays(cursor, -1),
            ArrowRight: () => addDays(cursor, 1),
            ArrowUp: () => addDays(cursor, -7),
            ArrowDown: () => addDays(cursor, 7),
            PageUp: () => addMonths(cursor, e.shiftKey ? -12 : -1),
            PageDown: () => addMonths(cursor, e.shiftKey ? 12 : 1),
            Home: () => addDays(cursor, -weekday),
            End: () => addDays(cursor, 6 - weekday),
        };
        const move = moves[e.key];
        if (!move) return;
        e.preventDefault();
        const next = clampIso(move());
        focusDayRef.current = true;
        moveCursor(next);
        if (selectingEnd) setHoverDate(next); // keyboard previews the range too
    };

    // Range shown in the grid (while picking the end, the hovered day previews it)
    const previewEnd = selectingEnd ? hoverDate : end;
    let lo = start;
    let hi = previewEnd;
    if (lo && hi && hi < lo) [lo, hi] = [hi, lo];
    const hasSpan = Boolean(lo && hi && lo !== hi);

    const presets = today ? buildPresets(today) : [];
    const summary =
        start && end ? triggerLabel(start, end) : selectingEnd ? "Now pick an end date" : "Pick a start date";

    const renderDays = () => {
        const total = daysInMonth(cy, cm);
        const lead = weekdayOf(cy, cm, 1);
        const cells: (string | null)[] = [
            ...Array.from({ length: lead }, () => null),
            ...Array.from({ length: total }, (_, i) => toIso(cy, cm, i + 1)),
        ];
        while (cells.length < 42) cells.push(null); // always 6 rows: no height jump

        return (
            <div
                ref={gridRef}
                key={`${cy}-${cm}`}
                className={slide ? `drp-days drp-slide-${slide}` : "drp-days"}
                onKeyDown={handleGridKeyDown}
                onMouseLeave={() => setHoverDate("")}
            >
                {WEEKDAYS.map((w) => (
                    <span key={w} className="drp-weekday" aria-hidden="true">
                        {w}
                    </span>
                ))}
                {cells.map((iso, i) => {
                    if (!iso) return <span key={`empty-${i}`} className="drp-cell" aria-hidden="true" />;
                    const { d } = parseIso(iso);
                    const isStart = iso === lo;
                    const isEnd = Boolean(hi) && iso === hi;
                    const inRange = hasSpan && iso > lo && iso < hi;
                    const outOfBounds = iso < minIso || iso > maxIso;
                    const cellClass = [
                        "drp-cell",
                        inRange && "in-range",
                        hasSpan && isStart && "range-start",
                        hasSpan && isEnd && "range-end",
                    ]
                        .filter(Boolean)
                        .join(" ");
                    const dayClass = [
                        "drp-day",
                        (isStart || isEnd) && "is-edge",
                        selectingEnd && iso === hoverDate && "is-preview",
                        iso === today && "is-today",
                    ]
                        .filter(Boolean)
                        .join(" ");
                    return (
                        <span key={iso} className={cellClass}>
                            <button
                                type="button"
                                className={dayClass}
                                data-date={iso}
                                tabIndex={iso === cursor ? 0 : -1}
                                disabled={outOfBounds}
                                aria-label={`${WEEKDAY_NAMES[weekdayOf(cy, cm, d)]}, ${MONTHS[cm]} ${d}, ${cy}`}
                                aria-pressed={isStart || isEnd}
                                aria-current={iso === today ? "date" : undefined}
                                onClick={() => pickDay(iso)}
                                onFocus={() => iso !== cursor && setCursor(iso)}
                                onMouseEnter={() => selectingEnd && setHoverDate(iso)}
                            >
                                {d}
                            </button>
                        </span>
                    );
                })}
            </div>
        );
    };

    const renderMonths = () => (
        <div key={`m-${cy}`} className="drp-zoom">
            {MONTHS.map((name, i) => {
                const active = (start && parseIso(start).y === cy && parseIso(start).m === i) ||
                    (end && parseIso(end).y === cy && parseIso(end).m === i);
                return (
                    <button
                        key={name}
                        type="button"
                        className={active ? "drp-zoom-item is-active" : "drp-zoom-item"}
                        onClick={() => {
                            setSlide("");
                            setCursor(toIso(cy, i, 1));
                            focusDayRef.current = true;
                            setView("days");
                        }}
                    >
                        {name.slice(0, 3)}
                    </button>
                );
            })}
        </div>
    );

    const renderYears = () => (
        <div key={`y-${pageStart}`} className="drp-zoom">
            {Array.from({ length: YEARS_PER_PAGE }, (_, i) => pageStart + i).map((year) => {
                const active = (start && parseIso(start).y === year) || (end && parseIso(end).y === year);
                return (
                    <button
                        key={year}
                        type="button"
                        className={active ? "drp-zoom-item is-active" : "drp-zoom-item"}
                        disabled={year > maxYear}
                        onClick={() => {
                            setCursor(toIso(year, cm, 1));
                            setView("months");
                        }}
                    >
                        {year}
                    </button>
                );
            })}
        </div>
    );

    const title =
        view === "days" ? `${MONTHS[cm]} ${cy}` : view === "months" ? String(cy) : `${pageStart} – ${pageStart + YEARS_PER_PAGE - 1}`;

    return (
        <div ref={rootRef} className="drp" data-open={open || undefined}>
            <button
                ref={buttonRef}
                id={buttonId}
                type="button"
                className={invalid ? "drp-trigger is-invalid" : "drp-trigger"}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
                aria-labelledby={labelId ? `${labelId} ${buttonId}` : undefined}
                onClick={() => (open ? close(false) : openPicker())}
            >
                <CalendarRange size={15} className="drp-trigger-icon" aria-hidden="true" />
                <span className={start || end ? "drp-value" : "drp-value is-placeholder"}>
                    {triggerLabel(start, end)}
                </span>
                <ChevronDown size={15} className="drp-chevron" aria-hidden="true" />
            </button>

            {open && (
                <div
                    id={panelId}
                    role="dialog"
                    aria-label="Choose a release date range"
                    className="drp-panel"
                    onKeyDown={handlePanelKeyDown}
                >
                    <div className="drp-presets">
                        {presets.map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                className={p.start === start && p.end === end ? "drp-preset is-active" : "drp-preset"}
                                onClick={() => applyPreset(p.start, p.end)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    <div className="drp-header">
                        <button
                            type="button"
                            className="drp-nav"
                            onClick={() => shift(-1)}
                            disabled={!canPrev}
                            aria-label="Previous"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            type="button"
                            className="drp-title"
                            onClick={() => setView(view === "days" ? "months" : view === "months" ? "years" : "days")}
                            aria-label={`${title}. Change view`}
                            aria-live="polite"
                        >
                            {title}
                        </button>
                        <button
                            type="button"
                            className="drp-nav"
                            onClick={() => shift(1)}
                            disabled={!canNext}
                            aria-label="Next"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {view === "days" ? renderDays() : view === "months" ? renderMonths() : renderYears()}

                    <div className="drp-footer">
                        <span className="drp-summary" aria-live="polite">
                            {summary}
                        </span>
                        <div className="drp-footer-actions">
                            <button type="button" className="drp-btn" onClick={clear} disabled={!start && !end}>
                                Clear
                            </button>
                            <button type="button" className="drp-btn drp-btn--primary" onClick={() => close()}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
