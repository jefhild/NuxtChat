export default defineNuxtPlugin(() => {
  const termlyId = useRuntimeConfig().public.TERMLY_ID;
  if (!termlyId) return;

  if (!document.getElementById("termly-resource-blocker")) {
    const s = document.createElement("script");
    s.id = "termly-resource-blocker";
    s.src = `https://app.termly.io/resource-blocker/${termlyId}?autoBlock=on`;
    s.defer = true;
    document.head.appendChild(s);
  }
});
