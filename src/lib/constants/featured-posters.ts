/**
 * Hand-picked anime posters for decorative backgrounds (hero marquee,
 * login dome). Static on purpose: no API call, so they render instantly
 * and cost nothing per visit. All URLs verified live on the MAL CDN.
 */
export interface FeaturedPoster {
    id: string;
    title: string;
    posterUrl: string;
}

export const FEATURED_POSTERS: FeaturedPoster[] = [
    {
        id: "16498",
        title: "Attack on Titan",
        posterUrl: "https://cdn.myanimelist.net/images/anime/10/47347l.webp",
    },
    {
        id: "1535",
        title: "Death Note",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1079/138100l.webp",
    },
    {
        id: "5114",
        title: "Fullmetal Alchemist: Brotherhood",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1208/94745l.webp",
    },
    {
        id: "30276",
        title: "One-Punch Man",
        posterUrl: "https://cdn.myanimelist.net/images/anime/12/76049l.webp",
    },
    {
        id: "38000",
        title: "Demon Slayer",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1286/99889l.webp",
    },
    {
        id: "52991",
        title: "Frieren: Beyond Journey's End",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1015/138006l.webp",
    },
    {
        id: "31964",
        title: "My Hero Academia",
        posterUrl: "https://cdn.myanimelist.net/images/anime/10/78745l.webp",
    },
    {
        id: "11757",
        title: "Sword Art Online",
        posterUrl: "https://cdn.myanimelist.net/images/anime/11/39717l.webp",
    },
    {
        id: "11061",
        title: "Hunter x Hunter",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1337/99013l.webp",
    },
    {
        id: "20",
        title: "Naruto",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1141/142503l.webp",
    },
    {
        id: "40748",
        title: "Jujutsu Kaisen",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1171/109222l.webp",
    },
    {
        id: "22319",
        title: "Tokyo Ghoul",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1498/134443l.webp",
    },
    {
        id: "32281",
        title: "Your Name.",
        posterUrl: "https://cdn.myanimelist.net/images/anime/5/87048l.webp",
    },
    {
        id: "9253",
        title: "Steins;Gate",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1935/127974l.webp",
    },
    {
        id: "44511",
        title: "Chainsaw Man",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1806/126216l.webp",
    },
];
