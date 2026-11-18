// MAL serves each poster in 3 sizes, chosen by a filename suffix:
//   …/94745t.webp  50×71    (~1.5 KB)  thumbnail
//   …/94745.webp   225×321  (~13 KB)   medium
//   …/94745l.webp  420×600  (~31 KB)   large (what we store)
const MAL_POSTER = /^(https:\/\/cdn\.myanimelist\.net\/images\/.+\/\d+)[lt]?\.(jpg|webp)$/;

/**
 * Poster sources for a board card:
 * - phones (56px wide): the thumbnail, medium on 2× screens (src + srcSet);
 * - desktop (72px wide): the medium size, sharp at 2× too (desktop).
 * URLs that aren't MAL posters (e.g. ImageKit) come back unchanged.
 */
export function cardPoster(url: string): { src: string; srcSet?: string; desktop?: string } {
    const match = MAL_POSTER.exec(url);
    if (!match) return { src: url };
    const [, base, ext] = match;
    const thumb = `${base}t.${ext}`;
    const medium = `${base}.${ext}`;
    return { src: thumb, srcSet: `${thumb} 1x, ${medium} 2x`, desktop: medium };
}
