"use client";

import {
    useEffect,
    useId,
    useRef,
    useState,
    type FocusEvent,
    type KeyboardEvent,
    type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
    value: string;
    label: string;
    /** Optional leading visual (icon, status dot). Decorative. */
    icon?: ReactNode;
}

interface SelectProps {
    value: string;
    options: readonly SelectOption[];
    onChange: (value: string) => void;
    /** id of the trigger button (lets a <label htmlFor> point at it). */
    id?: string;
    /** id of the visible label, so screen readers announce "Sort By, Most Popular". */
    labelId?: string;
    className?: string;
}

const TYPEAHEAD_RESET_MS = 500;

/**
 * Custom select (WAI-ARIA "select-only combobox" pattern: button + listbox).
 *
 * Keyboard: ↑/↓/Enter/Space open; inside the list ↑/↓, Home/End,
 * PageUp/PageDown move, Enter/Space choose, Esc closes, typing jumps to a
 * matching label ("20" → 2020). Clicking outside or tabbing away closes it.
 * Styles: `.select*` in globals.css (open animation, chevron, check pop).
 */
export function Select({ value, options, onChange, id, labelId, className }: SelectProps) {
    const autoId = useId();
    const buttonId = id ?? `select-${autoId}`;
    const listId = `${buttonId}-listbox`;

    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const typeaheadRef = useRef({ text: "", time: 0 });

    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
    const selected = options[selectedIndex];

    const openList = (index = selectedIndex) => {
        setActiveIndex(index);
        setOpen(true);
    };

    const close = (focusTrigger = true) => {
        setOpen(false);
        if (focusTrigger) buttonRef.current?.focus();
    };

    const choose = (index: number) => {
        const option = options[index];
        if (option) onChange(option.value);
        close();
    };

    // Move focus into the list when it opens (keyboard input goes there)
    useEffect(() => {
        if (open) listRef.current?.focus({ preventScroll: true });
    }, [open]);

    // Keep the active option visible — scrolls the list only, never the page
    useEffect(() => {
        const list = listRef.current;
        const item = list?.children[activeIndex] as HTMLElement | undefined;
        if (!open || !list || !item) return;
        if (item.offsetTop < list.scrollTop) {
            list.scrollTop = item.offsetTop;
        } else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
            list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
        }
    }, [open, activeIndex]);

    // Close on a click/tap anywhere outside
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    /** `now` = the key event's timeStamp (ms). */
    const typeahead = (char: string, now: number) => {
        const state = typeaheadRef.current;
        state.text = now - state.time > TYPEAHEAD_RESET_MS ? char : state.text + char;
        state.time = now;

        const query = state.text.toLowerCase();
        // A single repeated key cycles through matches; a word searches from the current one
        const start = state.text.length === 1 ? activeIndex + 1 : activeIndex;
        for (let i = 0; i < options.length; i++) {
            const index = (start + i) % options.length;
            if (options[index].label.toLowerCase().startsWith(query)) {
                setActiveIndex(index);
                return;
            }
        }
    };

    const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            openList();
        }
    };

    const handleListKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
        const last = options.length - 1;
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, last));
                break;
            case "ArrowUp":
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
                break;
            case "PageDown":
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 10, last));
                break;
            case "PageUp":
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 10, 0));
                break;
            case "Home":
                e.preventDefault();
                setActiveIndex(0);
                break;
            case "End":
                e.preventDefault();
                setActiveIndex(last);
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                choose(activeIndex);
                break;
            case "Escape":
                e.preventDefault();
                close();
                break;
            case "Tab":
                setOpen(false); // let focus move on naturally
                break;
            default:
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) typeahead(e.key, e.timeStamp);
        }
    };

    const handleListBlur = (e: FocusEvent<HTMLUListElement>) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
    };

    return (
        <div ref={rootRef} className={className ? `select ${className}` : "select"} data-open={open || undefined}>
            <button
                ref={buttonRef}
                id={buttonId}
                type="button"
                className="select-trigger"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-labelledby={labelId ? `${labelId} ${buttonId}` : undefined}
                onClick={() => (open ? close(false) : openList())}
                onKeyDown={handleTriggerKeyDown}
            >
                {selected?.icon && (
                    <span className="select-icon" aria-hidden="true">
                        {selected.icon}
                    </span>
                )}
                <span className="select-value">{selected?.label}</span>
                <ChevronDown size={15} className="select-chevron" aria-hidden="true" />
            </button>

            {open && (
                <ul
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    tabIndex={-1}
                    aria-labelledby={labelId}
                    aria-activedescendant={`${listId}-${activeIndex}`}
                    className="select-list"
                    onKeyDown={handleListKeyDown}
                    onBlur={handleListBlur}
                >
                    {options.map((option, index) => {
                        const isSelected = option.value === value;
                        return (
                            <li
                                key={option.value}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={isSelected}
                                className={index === activeIndex ? "select-option is-active" : "select-option"}
                                // Keep focus in the list so the click lands before blur closes it
                                onMouseDown={(e) => e.preventDefault()}
                                onMouseMove={() => {
                                    if (index !== activeIndex) setActiveIndex(index);
                                }}
                                onClick={() => choose(index)}
                            >
                                {option.icon && (
                                    <span className="select-icon" aria-hidden="true">
                                        {option.icon}
                                    </span>
                                )}
                                <span className="select-option-label">{option.label}</span>
                                {isSelected && <Check size={14} strokeWidth={2.5} className="select-check" aria-hidden="true" />}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
