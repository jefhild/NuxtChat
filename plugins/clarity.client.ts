export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const clarityId = String(config.public.CLARITY_ID || "").trim();
  const enabled = String(config.public.CLARITY_ENABLED || "true") === "true";
  const requireConsent =
    String(config.public.CLARITY_REQUIRE_CONSENT || "true") === "true";
  const consentCookieName = String(
    config.public.CLARITY_CONSENT_COOKIE || "TERMLY_API_CACHE"
  );
  const consentStorageKey = String(
    config.public.CLARITY_CONSENT_STORAGE_KEY || "TERMLY_API_CACHE"
  );
  const consentStorage = String(
    config.public.CLARITY_CONSENT_STORAGE || "both"
  );
  const consentRegexSource = String(
    config.public.CLARITY_CONSENT_REGEX || ""
  ).trim();

  if (!clarityId || !enabled) return;
  if (import.meta.dev) return;

  const hasClarity = () => !!document.getElementById("ms-clarity");

  const injectClarity = () => {
    if (hasClarity()) return;
    const script = document.createElement("script");
    script.id = "ms-clarity";
    script.text =
      '(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","' +
      clarityId +
      '");';
    document.head.appendChild(script);
  };

  const getCookie = (name: string) => {
    const match = document.cookie.match(
      new RegExp("(^|;\\s*)" + name + "=([^;]*)")
    );
    return match ? match[2] : "";
  };

  const cookieHasConsent = (raw: string) => {
    if (!raw) return false;
    const decoded = (() => {
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    })();

    if (consentRegexSource) {
      try {
        return new RegExp(consentRegexSource, "i").test(decoded);
      } catch {
        return false;
      }
    }

    const normalized = decoded.replace(/\\+/g, " ");
    try {
      const parsed = JSON.parse(normalized);
      if (parsed === true) return true;
      if (parsed?.consent === true) return true;
      if (parsed?.status === "accepted") return true;
      if (parsed?.analytics === true) return true;
      if (parsed?.performance === true) return true;
      if (parsed?.customization === true) return true;
      if (parsed?.functional === true) return true;

      const termlyConsent = parsed?.TERMLY_COOKIE_CONSENT?.value;
      if (termlyConsent?.analytics === true) return true;
      if (termlyConsent?.performance === true) return true;
      if (termlyConsent?.customization === true) return true;
      if (termlyConsent?.functional === true) return true;
      if (termlyConsent?.advertising === true) return true;
    } catch {
      // fall through to substring checks
    }

    return /consent|analytics|performance|customization|functional|accepted/i.test(
      normalized
    );
  };

  const getStorageValue = (key: string) => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  };

  const getConsentPayload = () => {
    const allowCookie = consentStorage === "cookie" || consentStorage === "both";
    const allowStorage =
      consentStorage === "local" || consentStorage === "both";
    const cookieValue = allowCookie ? getCookie(consentCookieName) : "";
    const storageValue = allowStorage ? getStorageValue(consentStorageKey) : "";
    return storageValue || cookieValue;
  };

  const hasConsent = () => {
    if (!requireConsent) return true;
    const raw = getConsentPayload();
    return cookieHasConsent(raw);
  };

  if (hasConsent()) {
    injectClarity();
    return;
  }

  const start = Date.now();
  const maxWaitMs = 5 * 60 * 1000;
  const interval = setInterval(() => {
    if (hasConsent()) {
      clearInterval(interval);
      injectClarity();
      return;
    }
    if (Date.now() - start > maxWaitMs) clearInterval(interval);
  }, 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && hasConsent()) injectClarity();
  });
});
