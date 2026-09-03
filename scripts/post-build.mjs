import { writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSW } from "workbox-build";

const clientDir = fileURLToPath(new URL("../dist/client", import.meta.url));
async function findAsset(prefix, ext) {
  const files = await readdir(join(clientDir, "assets"));
  const match = files.find((f) => f.startsWith(prefix) && f.endsWith(ext));
  if (!match) throw new Error(`Could not find ${prefix}*.${ext} in dist/client/assets`);
  return `assets/${match}`;
}

async function buildServiceWorker() {
  const { count, size } = await generateSW({
    globDirectory: clientDir,
    globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff2}"],
    swDest: join(clientDir, "sw.js"),
    clientsClaim: true,
    skipWaiting: true,
    navigateFallback: "index.html",
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
  });
  console.log(`service worker precaches ${count} files (${(size / 1024).toFixed(1)} KiB)`);
}

function buildHtml(entryJs, css) {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PackageYar — مدیریت تعمیرکار پکیج</title>
  <meta name="description" content="مدیریت مشتریان، تعمیرات، انبار و فاکتورهای فروش برای تعمیرکاران پکیج، آفلاین و قابل نصب روی موبایل و ویندوز.">
  <meta name="theme-color" content="#1f6470">
  <meta property="og:site_name" content="PackageYar">
  <meta property="og:title" content="PackageYar — مدیریت تعمیرکار پکیج">
  <meta property="og:description" content="داشبورد فروش، تعمیرات، بدهکاران و انبار در یک اپ آفلاین.">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="icon-192.png" type="image/png">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="apple-touch-icon" href="icons/icon-192.png">
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
  <link rel="stylesheet" href="${css}">
  <noscript>
    <style>body{padding:2rem;font-family:system-ui;text-align:center}</style>
    <p>برای استفاده از PackageYar جاوااسکریپت مرورگر را فعال کنید.</p>
  </noscript>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${entryJs}"></script>
</body>
</html>
`;
}

async function main() {
  const [entryJs, css] = await Promise.all([
    findAsset("index", ".js"),
    findAsset("styles", ".css"),
  ]);
  const html = buildHtml(entryJs, css);
  await writeFile(join(clientDir, "index.html"), html);
  await writeFile(join(clientDir, "404.html"), html);
  console.log("generated dist/client/index.html and dist/client/404.html");
  await buildServiceWorker();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
