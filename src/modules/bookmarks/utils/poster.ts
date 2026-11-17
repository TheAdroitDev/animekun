// MAL serves each poster in 3 sizes, chosen by a filename suffix:
//   …/94745t.webp  50×71    (~1.5 KB)  thumbnail
//   …/94745.webp   225×321  (~13 KB)   medium
//   …/94745l.webp  420×600  (~31 KB)   large (what we store)
const MAL_POSTER = /^(https:\/\/cdn\.myanimelist\.net\/images\/.+\/\d+)[lt]?\.(jpg|webp)$/;

/**
 * Small poster for a 48px-wide card: the thumbnail on normal screens, the
 * medium size on 2× screens. URLs that aren't MAL posters (e.g. ImageKit)
 * come back unchanged, with no srcSet.
 */
export function smallPoster(url: string): { src: string; srcSet?: string } {
    const match = MAL_POSTER.exec(url);
    if (!match) return { src: url };
    const [, base, ext] = match;
    return {
        src: `${base}t.${ext}`,
        srcSet: `${base}t.${ext} 1x, ${base}.${ext} 2x`,
    };
}
