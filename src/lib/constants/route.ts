export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  PRICING: "/pricing",

  ANIME: "/anime",
  ANIME_DETAIL: (id: string) => `/anime/${id}`,

  SEARCH: "/search",

  AUTH: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
  },

  DASHBOARD: {
    BOOKMARKS: "/bookmarks",
    PROFILE: "/profile",
    QUIZ: "/quiz",
    CHAT: "/chat",
    GENERATE: "/generate",
  },
} as const;