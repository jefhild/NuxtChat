export function loadTwitterWidgets(el) {
  if (typeof window === 'undefined') return;

  const run = () => {
    try {
      if (!(window.twttr && typeof window.twttr.widgets?.load === 'function')) return;

      // Normalize the element: support raw HTMLElement, Vue component ref, or ref.value
      let node = document;
      try {
        if (el) {
          if (el instanceof HTMLElement) node = el;
          else if (el?.$el) node = el.$el;
          else if (el?.value instanceof HTMLElement) node = el.value;
        }
      } catch (e) {
        node = document;
      }

      // Ensure `this` binding is correct for the load function
      try {
        window.twttr.widgets.load.call(window.twttr.widgets, node);
      } catch (err) {
        // Fallback to direct call
        window.twttr.widgets.load(node);
      }
    } catch (e) {
      // non-fatal
      // console.warn('twitter widgets load failed', e);
    }
  };

  if (window.twttr) {
    run();
    return;
  }

  const existing = document.querySelector(
    'script[src="https://platform.twitter.com/widgets.js"]'
  );
  if (existing) {
    if (existing.getAttribute('data-loaded') === '1') run();
    else existing.addEventListener('load', () => run());
    return;
  }

  const s = document.createElement('script');
  s.src = 'https://platform.twitter.com/widgets.js';
  s.async = true;
  s.charset = 'utf-8';
  s.addEventListener('load', () => {
    s.setAttribute('data-loaded', '1');
    run();
  });
  document.head.appendChild(s);
}
