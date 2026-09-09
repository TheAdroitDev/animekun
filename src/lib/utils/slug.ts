export function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

// Example Use Case
/* 

slugify("Attack on Titan");
// "attack-on-titan"

slugify("My Hero Academia!");
// "my-hero-academia"

slugify("  One   Piece  ");
// "one-piece" 
// 
*/