// /composables/useMarkdown.js

let _md = null;
let _sanitize = null;

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeMarkdown(text = "") {
  return String(text)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/^((?:#\s+){1,5}#)(?=\s)/gm, (match) => match.replace(/\s+/g, ""))
    .replace(/^[ \t]+(?=#{1,6}\s)/gm, "")
    .replace(/^(#{1,6})([^\s#])/gm, "$1 $2");
}

function normalizeRenderedMarkdownHtml(html = "") {
  return String(html).replace(
    /(^|\n)(#{1,6})\s+([^\n<][^\n]*)(?=\n<(?:p|ul|ol|blockquote|pre|hr|h[1-6])|$)/g,
    (_match, prefix, hashes, text) => {
      const level = Math.min(Math.max(String(hashes || "").length + 1, 2), 4);
      return `${prefix}<h${level}>${String(text || "").trim()}</h${level}>`;
    }
  );
}

export function useMarkdown() {
  const init = async () => {
    // already initialized?
    if (_md && _sanitize) return;

    // client-lazy load the libs
    const [{ default: MarkdownIt }, { default: DOMPurify }] = await Promise.all([
      import("markdown-it"),
      import("isomorphic-dompurify"),
    ]);

    const md = new MarkdownIt({
      html: false, // keep raw HTML disabled
      linkify: true,
      breaks: true, // convert \n to <br>
    });

    // Open external links in a new tab; keep internal links in-app.
    const defaultLinkOpen =
      md.renderer.rules.link_open ||
      ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));
    md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
      const hrefIdx = tokens[idx].attrIndex("href");
      const href = hrefIdx >= 0 ? tokens[idx].attrs[hrefIdx][1] : "";
      const isExternal =
        /^https?:\/\//i.test(href) ||
        /^\/\//.test(href) ||
        /^mailto:/i.test(href) ||
        /^tel:/i.test(href);
      const tIdx = tokens[idx].attrIndex("target");
      const targetValue = isExternal ? "_blank" : "_self";
      if (tIdx < 0) tokens[idx].attrPush(["target", targetValue]);
      else tokens[idx].attrs[tIdx][1] = targetValue;
      if (isExternal) tokens[idx].attrPush(["rel", "noopener noreferrer"]);
      return defaultLinkOpen(tokens, idx, opts, env, self);
    };

    _md = md;
    _sanitize = DOMPurify.sanitize.bind(DOMPurify);
  };

  const render = (text) => {
    const raw = normalizeMarkdown(text ?? "");
    // before init (SSR/early mount): escape + keep line breaks readable
    if (!_md || !_sanitize) return escapeHtml(raw).replace(/\n/g, "<br>");
    let html = normalizeRenderedMarkdownHtml(_md.render(raw));
    html = html
      .replace(/\[\[br\]\]/g, "<br><br>")
      .replace(/\[\[divider\]\]/g, "<hr>");
    return _sanitize(html, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "hr",
        "em",
        "strong",
        "a",
        "ul",
        "ol",
        "li",
        "code",
        "pre",
        "blockquote",
        "h1",
        "h2",
        "h3",
        "h4",
      ],
      ALLOWED_ATTR: ["href", "target", "rel"],
    });
  };

  return { init, render };
}
