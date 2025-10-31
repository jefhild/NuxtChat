// server/utils/sanitizeHtml.js
import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(html = "") {
  return DOMPurify.sanitize(html);
}
