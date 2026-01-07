// server/utils/sanitizeHtml.js
import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(html = "") {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["data-persona-slug", "role", "tabindex", "aria-label"],
  });
}
