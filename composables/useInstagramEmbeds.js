export function loadInstagramEmbeds(el) {
  if (typeof window === "undefined") return;

  const run = () => {
    try {
      const embeds = window.instgrm?.Embeds;
      if (!embeds || typeof embeds.process !== "function") return;

      let node = document;
      try {
        if (el) {
          if (el instanceof HTMLElement) node = el;
          else if (el?.$el instanceof HTMLElement) node = el.$el;
          else if (el?.value instanceof HTMLElement) node = el.value;
        }
      } catch {
        node = document;
      }

      embeds.process(node);
    } catch {
      // non-fatal
    }
  };

  if (window.instgrm?.Embeds) {
    run();
    return;
  }

  const existing = document.querySelector(
    'script[src="https://www.instagram.com/embed.js"]'
  );
  if (existing) {
    if (existing.getAttribute("data-loaded") === "1") run();
    else existing.addEventListener("load", () => run(), { once: true });
    return;
  }

  const s = document.createElement("script");
  s.src = "https://www.instagram.com/embed.js";
  s.async = true;
  s.addEventListener("load", () => {
    s.setAttribute("data-loaded", "1");
    run();
  });
  document.head.appendChild(s);
}
