import { defineEventHandler, getRequestHeader, setCookie } from "h3";

const I18N_COOKIE_KEY = "i18n_redirected";
const DEFAULT_LOCALE = "en";

const BOT_UA_PATTERN =
  /bot|crawler|spider|crawling|googlebot|bingbot|duckduckbot|baiduspider|yandex|slurp|facebookexternalhit|twitterbot|linkedinbot|applebot|semrush/i;

function hasLocaleCookie(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.includes(`${I18N_COOKIE_KEY}=`);
}

export default defineEventHandler((event) => {
  const path = event.path || "/";
  if (path !== "/") return;

  const userAgent = getRequestHeader(event, "user-agent") || "";
  if (!BOT_UA_PATTERN.test(userAgent)) return;

  const cookieHeader = getRequestHeader(event, "cookie") || "";
  if (!hasLocaleCookie(cookieHeader)) {
    // Ensure i18n sees a deterministic locale on this same request.
    event.node.req.headers.cookie = cookieHeader
      ? `${cookieHeader}; ${I18N_COOKIE_KEY}=${DEFAULT_LOCALE}`
      : `${I18N_COOKIE_KEY}=${DEFAULT_LOCALE}`;
  }

  // Persist for subsequent requests as well.
  setCookie(event, I18N_COOKIE_KEY, DEFAULT_LOCALE, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
  });
});
