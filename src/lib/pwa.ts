const basePath = (import.meta.env["VITE_BASE_PATH"] as string | undefined) ?? "";
const SW_URL = `${basePath}/sw.js`.replace(/\/+/g, "/");
const SW_SCOPE = `${basePath}/`.replace(/\/+/g, "/") || "/";

function isPreviewHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppWorker() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((registration) =>
        (registration.active?.scriptURL ?? registration.installing?.scriptURL ?? "").endsWith(
          SW_URL,
        ),
      )
      .map((registration) => registration.unregister()),
  );
}

export function setupPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const refused =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isPreviewHost(window.location.hostname) ||
    (new URLSearchParams(window.location.search).has("sw") &&
      new URLSearchParams(window.location.search).get("sw") === "off");

  if (refused) {
    void unregisterAppWorker();
    return;
  }

  const register = () => {
    navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE }).catch(() => {
      /* registration failures are non-fatal */
    });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}
