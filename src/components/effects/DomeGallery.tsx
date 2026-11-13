"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
} from "react";

/**
 * DomeGallery — a draggable 3D dome of poster tiles (decorative background).
 *
 * Adapted from React Bits' DomeGallery (MIT). Changes from the original:
 * - TypeScript; BEM `dome-*` classes (styles in globals.css) instead of
 *   generic globals like `.item` / `.overlay`; no nested <main>.
 * - Decorative only: aria-hidden, no focusable tiles, no click-to-enlarge
 *   (that would open behind the login card), so ~250 lines of DOM code and
 *   the @use-gesture/react dependency are gone — plain Pointer Events.
 * - Touch: horizontal swipe spins, vertical swipe still scrolls the page
 *   (touch-action: pan-y on coarse pointers).
 * - Optional slow idle spin (autoRotateSpeed), paused while dragging.
 * - Reduced motion: no idle spin and no inertia glide after a drag.
 *
 * Only DOM + CSS 3D transforms. With autoRotateSpeed = 0 no animation loop
 * runs while idle; otherwise one rAF updates a single transform per frame
 * (browsers pause rAF in background tabs).
 */

interface DomeGalleryProps {
    /** Image URLs. Cycled across all tiles, so ~15 URLs = ~15 downloads. */
    images: readonly string[];
    /** Columns around the dome. */
    segments?: number;
    /** Tiles per column. More rows = taller dome (top/bottom edges off-screen). */
    rows?: number;
    /** Dome radius as a fraction of the container's width/size. */
    fit?: number;
    minRadius?: number;
    maxRadius?: number;
    /** How far the dome can tilt up/down, in degrees. */
    maxVerticalRotationDeg?: number;
    /** Pixels of drag per degree of rotation (higher = slower). */
    dragSensitivity?: number;
    /** 0..1 — how long the dome keeps gliding after a flick. */
    dragDampening?: number;
    /** Idle spin in degrees/second (+ = left→right, − = right→left, 0 = off). */
    autoRotateSpeed?: number;
    tileRadius?: string;
    /** Backdrop + vignette color. Defaults to the theme background. */
    background?: string;
    grayscale?: boolean;
    className?: string;
}

interface Tile {
    x: number;
    y: number;
    src: string;
}

interface DragState {
    pointerId: number;
    startX: number;
    startY: number;
    startRotation: { x: number; y: number };
    moved: boolean;
    samples: { t: number; x: number; y: number }[];
}

const MAX_VELOCITY = 1.4; // px/ms, clamps wild flicks
const VELOCITY_WINDOW_MS = 100; // only the last 100ms of a drag counts

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Wrap an angle into [-180, 180). */
const wrapAngle = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/** Lay out `rows` tiles per column (odd columns offset by one row) and cycle images over them. */
function buildTiles(images: readonly string[], segments: number, rows: number): Tile[] {
    // rows = 5 → even columns [-4, -2, 0, 2, 4], odd columns [-3, -1, 1, 3, 5]
    const evenYs = Array.from({ length: rows }, (_, r) => -(rows - 1) + r * 2);
    const oddYs = evenYs.map((y) => y + 1);
    const firstX = -(segments + 2);

    const coords = Array.from({ length: segments }, (_, c) => {
        const x = firstX + c * 2;
        return (c % 2 === 0 ? evenYs : oddYs).map((y) => ({ x, y }));
    }).flat();

    if (images.length === 0) return coords.map((c) => ({ ...c, src: "" }));

    const srcs = coords.map((_, i) => images[i % images.length]);

    // Avoid the same poster sitting next to itself
    for (let i = 1; i < srcs.length; i++) {
        if (srcs[i] !== srcs[i - 1]) continue;
        const j = srcs.findIndex((s, k) => k > i && s !== srcs[i]);
        if (j !== -1) [srcs[i], srcs[j]] = [srcs[j], srcs[i]];
    }

    return coords.map((c, i) => ({ ...c, src: srcs[i] }));
}

export function DomeGallery({
    images,
    segments = 35,
    rows = 5,
    fit = 0.5,
    minRadius = 600,
    maxRadius = Infinity,
    maxVerticalRotationDeg = 5,
    dragSensitivity = 20,
    dragDampening = 0.8,
    autoRotateSpeed = 0,
    tileRadius = "20px",
    background = "var(--bg-primary)",
    grayscale = false,
    className,
}: DomeGalleryProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const sphereRef = useRef<HTMLDivElement>(null);
    const rotationRef = useRef({ x: 0, y: 0 });
    const dragRef = useRef<DragState | null>(null);
    const inertiaFrameRef = useRef<number | null>(null);

    const tiles = useMemo(() => buildTiles(images, segments, rows), [images, segments, rows]);

    const applyRotation = useCallback((x: number, y: number) => {
        rotationRef.current = { x, y };
        const sphere = sphereRef.current;
        if (sphere) {
            sphere.style.transform = `translateZ(calc(var(--dome-radius) * -1)) rotateX(${x}deg) rotateY(${y}deg)`;
        }
    }, []);

    // Radius follows the container size (wide screens: width, else the smaller side)
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        const observer = new ResizeObserver(([entry]) => {
            const w = Math.max(1, entry.contentRect.width);
            const h = Math.max(1, entry.contentRect.height);
            const basis = w / h >= 1.3 ? w : Math.min(w, h);
            const radius = clamp(Math.min(basis * fit, h * 1.35), minRadius, maxRadius);
            root.style.setProperty("--dome-radius", `${Math.round(radius)}px`);
        });

        observer.observe(root);
        return () => observer.disconnect();
    }, [fit, minRadius, maxRadius]);

    const stopInertia = useCallback(() => {
        if (inertiaFrameRef.current !== null) {
            cancelAnimationFrame(inertiaFrameRef.current);
            inertiaFrameRef.current = null;
        }
    }, []);

    // Never leave a frame scheduled after unmount
    useEffect(() => stopInertia, [stopInertia]);

    // Slow idle spin ("like Earth"). Yields to the user: paused while a drag
    // or the inertia glide runs, then picks up from wherever they left it.
    useEffect(() => {
        if (!autoRotateSpeed) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        let frame = 0;
        let last = performance.now();

        const tick = (now: number) => {
            const dt = Math.min(now - last, 50); // no jump after a tab switch / jank
            last = now;
            if (!dragRef.current && inertiaFrameRef.current === null) {
                const { x, y } = rotationRef.current;
                applyRotation(x, wrapAngle(y + (autoRotateSpeed * dt) / 1000));
            }
            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [autoRotateSpeed, applyRotation]);

    const startInertia = useCallback(
        (vx: number, vy: number) => {
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

            let velX = clamp(vx, -MAX_VELOCITY, MAX_VELOCITY) * 80;
            let velY = clamp(vy, -MAX_VELOCITY, MAX_VELOCITY) * 80;
            const d = clamp(dragDampening, 0, 1);
            const friction = 0.94 + 0.055 * d;
            const stopThreshold = 0.015 - 0.01 * d;
            const maxFrames = Math.round(90 + 270 * d);
            let frames = 0;

            const step = () => {
                velX *= friction;
                velY *= friction;
                const done =
                    (Math.abs(velX) < stopThreshold && Math.abs(velY) < stopThreshold) ||
                    ++frames > maxFrames;
                if (done) {
                    inertiaFrameRef.current = null;
                    return;
                }
                const { x, y } = rotationRef.current;
                applyRotation(
                    clamp(x - velY / 200, -maxVerticalRotationDeg, maxVerticalRotationDeg),
                    wrapAngle(y + velX / 200)
                );
                inertiaFrameRef.current = requestAnimationFrame(step);
            };

            stopInertia();
            inertiaFrameRef.current = requestAnimationFrame(step);
        },
        [applyRotation, dragDampening, maxVerticalRotationDeg, stopInertia]
    );

    const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        stopInertia();
        dragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            startRotation: { ...rotationRef.current },
            moved: false,
            samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }],
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;

        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;

        // Ignore tiny jitters so a plain click/tap doesn't count as a drag
        if (!drag.moved && dx * dx + dy * dy > 16) {
            drag.moved = true;
            rootRef.current?.setAttribute("data-dragging", "");
        }

        applyRotation(
            clamp(drag.startRotation.x - dy / dragSensitivity, -maxVerticalRotationDeg, maxVerticalRotationDeg),
            wrapAngle(drag.startRotation.y + dx / dragSensitivity)
        );

        drag.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
        while (drag.samples.length > 2 && e.timeStamp - drag.samples[0].t > VELOCITY_WINDOW_MS) {
            drag.samples.shift();
        }
    };

    const endDrag = (e: ReactPointerEvent<HTMLDivElement>, withInertia: boolean) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;
        dragRef.current = null;
        rootRef.current?.removeAttribute("data-dragging");

        if (!withInertia || !drag.moved) return;

        const first = drag.samples[0];
        const last = drag.samples[drag.samples.length - 1];
        const dt = last.t - first.t;
        // Released after holding still → no glide
        if (dt <= 0 || e.timeStamp - last.t > VELOCITY_WINDOW_MS) return;

        const vx = (last.x - first.x) / dt;
        const vy = (last.y - first.y) / dt;
        if (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005) startInertia(vx, vy);
    };

    const rootStyle = {
        "--dome-segments": segments,
        "--dome-bg": background,
        "--dome-tile-radius": tileRadius,
        "--dome-img-filter": grayscale ? "grayscale(1)" : "none",
    } as CSSProperties;

    return (
        <div ref={rootRef} className={className ? `dome ${className}` : "dome"} style={rootStyle} aria-hidden="true">
            <div
                className="dome-viewport"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => endDrag(e, true)}
                onPointerCancel={(e) => endDrag(e, false)}
            >
                <div className="dome-stage">
                    <div ref={sphereRef} className="dome-sphere">
                        {tiles.map((tile) => (
                            <div
                                key={`${tile.x},${tile.y}`}
                                className="dome-item"
                                style={{ "--dome-x": tile.x, "--dome-y": tile.y } as CSSProperties}
                            >
                                <div className="dome-tile">
                                    {tile.src && (
                                        // Plain <img> on purpose: posters load straight from the
                                        // MAL CDN, skipping /_next/image (Vercel image quota).
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={tile.src} alt="" draggable={false} decoding="async" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dome-vignette" />
                <div className="dome-fade dome-fade--top" />
                <div className="dome-fade dome-fade--bottom" />
            </div>
        </div>
    );
}
