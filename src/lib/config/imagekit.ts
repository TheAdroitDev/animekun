import { getEnv } from "@/lib/config/env";

/**
 * ImageKit client configuration.
 * Exposes the URL endpoint required for image optimization with @imagekit/next.
 */
export function getImageKitConfig() {
  const env = getEnv();
  return {
    urlEndpoint: env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
  };
}
