// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

const isGitHubActions = process.env["GITHUB_ACTIONS"] === "true";
const repoName = "js-package-pal";
// GitHub Pages project sites are served under /<repoName>/. Use an absolute base so
// TanStack Router derives the correct router basepath and asset URLs resolve from the repo root.
const base = isGitHubActions ? `/${repoName}/` : "/";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // GitHub Pages project sites are served under /<repoName>; keep the router basepath
    // absolute so hydration updates it to a valid value instead of stripping the leading slash.
    ...(isGitHubActions ? { router: { basepath: `/${repoName}` } } : {}),
    // Use a pure client-side entry for the static GitHub Pages build so hydration does not
    // expect server-rendered state (window.$_TSR).
    ...(isGitHubActions ? { client: { entry: "entry-client.tsx" } } : {}),
  },
  // Let Lovable use its default Nitro preset; GitHub Pages gets a client-only static build
  // and we generate the HTML shell with scripts/post-build.cjs.
  nitro: isGitHubActions ? false : true,
  vite: {
    base,
    define: isGitHubActions
      ? {
          "import.meta.env.VITE_BASE_PATH": JSON.stringify(`/${repoName}`),
          // Tells src/routes/__root.tsx to skip rendering <html>/<head>/<body>,
          // because scripts/post-build.mjs already generates the HTML shell and
          // entry-client.tsx mounts into <div id="root">.
          "import.meta.env.VITE_STATIC_SHELL": JSON.stringify("true"),
        }
      : {},
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: {
          name: "پکیج‌یار",
          short_name: "پکیج‌یار",
          description: "سیستم مدیریت تعمیرکار پکیج — مشتریان، تعمیرات، انبار و فروش",
          lang: "fa",
          dir: "rtl",
          start_url: ".",
          scope: ".",
          display: "standalone",
          orientation: "portrait",
          background_color: "#fbf9f4",
          theme_color: "#1f6470",
          icons: [
            {
              src: "icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable",
            },
            {
              src: "icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "pages" },
            },
            {
              urlPattern: ({ url, request }) =>
                url.origin === self.location.origin &&
                ["style", "script", "font", "image"].includes(request.destination),
              handler: "CacheFirst",
              options: { cacheName: "assets", expiration: { maxEntries: 200 } },
            },
          ],
        },
      }),
    ],
  },
});
