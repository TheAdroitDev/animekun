/**
 * "Toss it" delete animation for board cards: the card lifts, crumples into
 * a ramen topping (random: egg, naruto, nori, chashu, menma), squashes,
 * winds up and flies in a ballistic arc into the bowl; Undo pops the same
 * topping back out, flies it home and unfolds it into the card.
 *
 * Motion and timings follow StarKnightt/paper-toss (MIT,
 * https://github.com/StarKnightt/paper-toss), rebuilt as a light DOM
 * version: a clone of the card is animated with the Web Animations API
 * (no canvas, no physics engine, no dependency). Rim bounces are left out.
 */

// ── Timings (ms) and physics, from paper-toss ─────────────────────────────
const LIFT = 120;
const CRUMPLE = 380;
const SQUASH = 170;
const WIND = 110;
const LAUNCH = LIFT + CRUMPLE + SQUASH + WIND; // 780
const DROP = 160; // ball sinks into the can after it reaches the mouth
const OUT_DELAY = 200; // restore: lid opens, then the ball pops out
const TF = 560; // restore: flight time back to the card
const UNCRUMPLE = 420;
const SETTLE = 200;
const GRAV = 2400; // px/s²
const FRAME = 1000 / 60;

// ── Toppings: what the card turns into (CSS skin .toss-skin--<name>) ──────
export const TOPPINGS = ["egg", "naruto", "nori", "chashu", "menma"] as const;
export type Topping = (typeof TOPPINGS)[number];

// Final size (px) and corner radius (% of the box) of each topping.
const SHAPES: Record<Topping, { w: number; h: number; radius: number }> = {
    egg: { w: 30, h: 24, radius: 50 }, // 味玉, oval
    naruto: { w: 28, h: 28, radius: 50 }, // round slice
    nori: { w: 30, h: 22, radius: 10 }, // dark sheet
    chashu: { w: 32, h: 28, radius: 50 }, // pork slice
    menma: { w: 34, h: 14, radius: 40 }, // bamboo-shoot strip
};

export function randomTopping(): Topping {
    return TOPPINGS[Math.floor(Math.random() * TOPPINGS.length)];
}

/** Total restore time; the real card is revealed at the end. */
export const RESTORE_MS = OUT_DELAY + TF + UNCRUMPLE + SETTLE; // 1380

export const ease = {
    outCubic: (t: number) => 1 - (1 - t) ** 3,
    inCubic: (t: number) => t * t * t,
    inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
    inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: (t: number) => {
        const s = 1.4;
        return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
    },
    smooth: (t: number) => t * t * (3 - 2 * t),
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export function prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** What the animation needs from the bin (implemented by TossBin). */
export interface BinTarget {
    /** Centre of the can's opening, in viewport px. */
    mouth(): { x: number; y: number };
    /** Lid: open() / close() are counted, so overlapping tosses share it. */
    open(): void;
    close(): void;
    /** Optional effect when the ball goes in or comes out (e.g. a broth splash). */
    splash?(): void;
}

// One animation frame of the ball/card.
interface Pose {
    x: number; // centre, viewport px
    y: number;
    rot: number; // radians
    sx: number; // squash/stretch on top of the crumple scale
    sy: number;
    p: number; // 0 = flat card, 1 = topping
    sh: number; // shadow strength 0..1
    alpha: number;
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** A fixed-position copy of the card (with the topping's skin) to animate. */
function createGhost(cardEl: HTMLElement, topping: Topping) {
    const rect = cardEl.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "toss-ghost";
    ghost.setAttribute("aria-hidden", "true");
    ghost.inert = true;
    Object.assign(ghost.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
    });

    const content = document.createElement("div");
    content.className = "toss-ghost-content";
    const clone = cardEl.cloneNode(true) as HTMLElement;
    // The clone must never be found as "the card" or announced.
    clone.removeAttribute("data-bookmark-id");
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    content.appendChild(clone);

    const skin = document.createElement("div");
    skin.className = `toss-ghost-skin toss-skin--${topping}`;

    ghost.append(content, skin);
    document.body.appendChild(ghost);
    return { ghost, content, skin, rect, shape: SHAPES[topping] };
}

/** Samples a pose timeline into keyframes and plays it on the ghost. */
function play(
    parts: ReturnType<typeof createGhost>,
    total: number,
    pose: (t: number) => Pose,
): Promise<void> {
    const { ghost, content, skin, rect, shape } = parts;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const ballX = shape.w / rect.width;
    const ballY = shape.h / rect.height;

    const ghostFrames: Keyframe[] = [];
    const contentFrames: Keyframe[] = [];
    const skinFrames: Keyframe[] = [];
    const steps = Math.max(2, Math.ceil(total / FRAME));

    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * total;
        const s = pose(t);
        const kx = lerp(1, ballX, s.p) * s.sx;
        const ky = lerp(1, ballY, s.p) * s.sy;
        const offset = i / steps;
        ghostFrames.push({
            offset,
            transform: `translate(${s.x - cx}px, ${s.y - cy}px) rotate(${s.rot}rad) scale(${kx}, ${ky})`,
            borderRadius: `${lerp(4, shape.radius, s.p)}%`,
            boxShadow: `0 ${6 + 10 * s.sh}px ${10 + 16 * s.sh}px rgba(20, 22, 40, ${(0.1 + 0.2 * s.sh) * s.alpha})`,
            opacity: s.alpha,
        });
        contentFrames.push({ offset, opacity: 1 - clamp01((s.p - 0.15) / 0.55) });
        skinFrames.push({ offset, opacity: clamp01((s.p - 0.25) / 0.5) });
    }

    const options: KeyframeAnimationOptions = { duration: total, easing: "linear", fill: "forwards" };
    const anims = [
        ghost.animate(ghostFrames, options),
        content.animate(contentFrames, options),
        skin.animate(skinFrames, options),
    ];
    return Promise.all(anims.map((a) => a.finished)).then(
        () => undefined,
        () => undefined, // cancelled: nothing to do
    );
}

/**
 * Card → ball → bin. Call it BEFORE hiding the card (it clones it).
 * `landed` resolves when the ball drops into the can (count + toast time),
 * `done` when the ghost has been removed.
 */
export function tossToBin(
    cardEl: HTMLElement,
    bin: BinTarget,
    topping: Topping,
): { landed: Promise<void>; done: Promise<void> } {
    const parts = createGhost(cardEl, topping);
    const { rect } = parts;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const target = bin.mouth();

    const x1 = cx;
    const y1 = cy - 8; // where the wind-up ends
    // Flight time grows with distance (paper-toss searches 0.56–0.92 s).
    const T = Math.min(0.92, Math.max(0.56, 0.5 + Math.hypot(target.x - x1, target.y - y1) / 3200));
    const vx = (target.x - x1) / T;
    const vy = (target.y - y1 - 0.5 * GRAV * T * T) / T;
    const spin = (Math.random() - 0.5) * 1.4;
    const flight = T * 1000;
    const total = LAUNCH + flight + DROP;

    const pose = (t: number): Pose => {
        if (t < LIFT) {
            const k = ease.outCubic(t / LIFT);
            const sc = 1 + 0.02 * k;
            return { x: cx, y: cy - 3 * k, rot: 0, sx: sc, sy: sc, p: 0, sh: k, alpha: 1 };
        }
        if (t < LIFT + CRUMPLE) {
            const k = (t - LIFT) / CRUMPLE;
            const sc = 1.02 - 0.02 * k;
            return {
                x: cx,
                y: cy - 3 - 5 * ease.outCubic(k),
                rot: spin * ease.inOutCubic(k),
                sx: sc,
                sy: sc,
                p: ease.inOutSine(k),
                sh: 1,
                alpha: 1,
            };
        }
        if (t < LIFT + CRUMPLE + SQUASH) {
            const k = (t - LIFT - CRUMPLE) / SQUASH;
            const q = 0.22 * Math.sin(k * 2.6 * Math.PI) * Math.exp(-3.2 * k);
            return { x: cx, y: y1, rot: spin, sx: 1 + q, sy: 1 - q, p: 1, sh: 1, alpha: 1 };
        }
        if (t < LAUNCH) {
            const k = (t - LIFT - CRUMPLE - SQUASH) / WIND;
            const q = Math.sin(Math.PI * k);
            return { x: cx, y: y1 + 5 * q, rot: spin, sx: 1 + 0.12 * q, sy: 1 - 0.14 * q, p: 1, sh: 1, alpha: 1 };
        }
        if (t < LAUNCH + flight) {
            const tf = (t - LAUNCH) / 1000;
            return {
                x: x1 + vx * tf,
                y: y1 + vy * tf + 0.5 * GRAV * tf * tf,
                rot: spin + 8 * tf,
                sx: 1,
                sy: 1,
                p: 1,
                sh: Math.max(0.25, 1 - tf * 6),
                alpha: 1,
            };
        }
        // Into the can (the bin's front wall is drawn over the ball).
        const k = clamp01((t - LAUNCH - flight) / DROP);
        return {
            x: target.x,
            y: target.y + 26 * ease.inCubic(k),
            rot: spin + 8 * T + 2 * k,
            sx: 1,
            sy: 1,
            p: 1,
            sh: 0.25,
            alpha: 1 - clamp01((k - 0.4) / 0.6),
        };
    };

    // Lid opens as the card lifts, closes once the ball is in.
    const openTimer = window.setTimeout(() => bin.open(), LIFT * 0.5);
    const landed = wait(LAUNCH + flight).then(() => {
        bin.splash?.();
        bin.close();
    });
    const done = play(parts, total, pose).finally(() => {
        window.clearTimeout(openTimer);
        parts.ghost.remove();
    });
    return { landed, done };
}

/**
 * Bin → ball → card (Undo). `cardEl` is the restored card, already in the
 * list but hidden. Resolves when the real card should be revealed.
 */
export async function popFromBin(cardEl: HTMLElement, bin: BinTarget, topping: Topping): Promise<void> {
    bin.open();
    const parts = createGhost(cardEl, topping);
    const { rect } = parts;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const mouth = bin.mouth();
    const sp = { x: mouth.x, y: mouth.y + parts.shape.h * 0.45 }; // inside the bowl
    const tp = { x: cx, y: cy - 8 };
    const tf = TF / 1000;
    const vx = (tp.x - sp.x) / tf;
    const vy = (tp.y - sp.y - 0.5 * GRAV * tf * tf) / tf;
    const spin0 = (Math.random() - 0.5) * 1.4;
    const om = (-Math.PI * 2 - spin0) / tf; // one full turn back, ends upright

    const pose = (t: number): Pose => {
        if (t < OUT_DELAY) {
            return { x: sp.x, y: sp.y, rot: spin0, sx: 1, sy: 1, p: 1, sh: 0.25, alpha: 0 };
        }
        if (t < OUT_DELAY + TF) {
            const s = (t - OUT_DELAY) / 1000;
            return {
                x: sp.x + vx * s,
                y: sp.y + vy * s + 0.5 * GRAV * s * s,
                rot: spin0 + om * s,
                sx: 1,
                sy: 1,
                p: 1,
                sh: Math.min(1, 0.25 + s * 3),
                alpha: 1,
            };
        }
        if (t < OUT_DELAY + TF + UNCRUMPLE) {
            const k = (t - OUT_DELAY - TF) / UNCRUMPLE;
            const sc = 1 + 0.02 * ease.smooth(k);
            const q = 0.2 * Math.sin(Math.min(1, k * 3) * 2.4 * Math.PI) * Math.exp(-6 * k);
            return {
                x: cx,
                y: lerp(tp.y, cy - 3, ease.inOutCubic(k)),
                rot: -Math.PI * 2,
                sx: sc * (1 + q),
                sy: sc * (1 - q),
                p: 1 - ease.inOutCubic(k),
                sh: 1,
                alpha: 1,
            };
        }
        const k = clamp01((t - OUT_DELAY - TF - UNCRUMPLE) / SETTLE);
        const sc = 1.02 - 0.02 * k;
        return { x: cx, y: lerp(cy - 3, cy, ease.inOutSine(k)), rot: -Math.PI * 2, sx: sc, sy: sc, p: 0, sh: 1 - k, alpha: 1 };
    };

    const splashTimer = window.setTimeout(() => bin.splash?.(), OUT_DELAY);
    const closeTimer = window.setTimeout(() => bin.close(), OUT_DELAY + 240);
    try {
        await play(parts, RESTORE_MS, pose);
    } finally {
        window.clearTimeout(splashTimer);
        window.clearTimeout(closeTimer);
        parts.ghost.remove();
    }
}

/** When the ball pops out on Undo (for the bin count). */
export const POP_OUT_MS = OUT_DELAY;
