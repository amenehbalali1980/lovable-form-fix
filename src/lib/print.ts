import { formatMoney, formatNumber } from "./format";
import { emptyShopProfile, type ShopProfile } from "./settings";

export type PrintRow = { name: string; qty: number; price: number };
export type PrintTotal = { label: string; value: string; strong?: boolean };

export type PrintDocument = {
  docTitle: string;
  docNumber?: string | number | null | undefined;
  partyLabel: string;
  partyName: string;
  date: string;
  rows?: PrintRow[] | undefined;
  totals: PrintTotal[];
  extraInfo?: { label: string; value: string }[] | undefined;
  profile?: ShopProfile | undefined;
};

const escapeHtml = (value: string) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );

export function printDocument(doc: PrintDocument) {
  const profile = { ...emptyShopProfile, ...(doc.profile ?? {}) };
  const win = window.open("", "_blank", "width=820,height=900");
  if (!win) return;

  const itemsTable = doc.rows?.length
    ? `<table>
        <thead>
          <tr><th style="width:36px">#</th><th>شرح</th><th style="width:70px">تعداد</th><th style="width:130px">قیمت واحد</th><th style="width:140px">جمع</th></tr>
        </thead>
        <tbody>
          ${doc.rows
            .map(
              (r, i) =>
                `<tr><td>${formatNumber(i + 1)}</td><td>${escapeHtml(r.name)}</td><td>${formatNumber(r.qty)}</td><td>${formatMoney(r.price)}</td><td>${formatMoney(r.qty * r.price)}</td></tr>`,
            )
            .join("")}
        </tbody>
      </table>`
    : "";

  const extra = doc.extraInfo?.length
    ? `<div class="grid">${doc.extraInfo
        .map(
          (e) =>
            `<div><span class="lbl">${escapeHtml(e.label)}</span><span>${escapeHtml(e.value)}</span></div>`,
        )
        .join("")}</div>`
    : "";

  win.document.write(`<!doctype html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(doc.docTitle)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" />
<style>
  .no-print { margin: 12px; text-align: center; }
  .no-print button {
    font-family: Vazirmatn, Tahoma, sans-serif;
    font-size: 15px;
    padding: 10px 22px;
    border-radius: 8px;
    border: none;
    background: #1f6470;
    color: #fff;
    cursor: pointer;
  }
  @media print {
    .no-print { display: none !important; }
  }
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Vazirmatn, Tahoma, sans-serif; color:#111; margin:0; font-size:13px; }
  .sheet { border:1px solid #d4d4d4; border-radius:10px; padding:18px; }
  header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #111; padding-bottom:10px; }
  .shop { display:flex; align-items:flex-start; gap:12px; }
  .logo { width:58px; height:58px; object-fit:contain; }
  .shop h1 { margin:0 0 4px; font-size:18px; }
  .shop div { color:#555; font-size:11px; line-height:1.7; }
  .doc { text-align:left; }
  .doc .type { font-size:15px; font-weight:700; }
  .doc .meta { color:#555; font-size:11px; margin-top:4px; line-height:1.8; }
  .grid { display:flex; flex-wrap:wrap; gap:8px 24px; margin:14px 0; font-size:12px; }
  .lbl { color:#666; margin-left:6px; }
  table { width:100%; border-collapse:collapse; margin-top:8px; }
  th, td { border:1px solid #ccc; padding:7px 8px; text-align:right; }
  thead th { background:#f2f2f2; font-size:12px; }
  .totals { margin-top:14px; width:290px; margin-right:auto; }
  .totals div { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dashed #ddd; }
  .totals .strong { font-weight:700; border-bottom:2px solid #111; }
  footer { margin-top:26px; display:flex; justify-content:space-between; align-items:flex-end; font-size:11px; color:#555; }
  .sign { width:180px; text-align:center; border-top:1px dashed #999; padding-top:6px; }
  .note { max-width:60%; line-height:1.8; }
</style>
</head>
<body>
      <div class="no-print">
    <button type="button" onclick="window.close()">← بستن / بازگشت</button>
  </div>
  <div class="sheet">
    <header>
      <div class="shop">
        ${profile.logo ? `<img class="logo" src="${escapeHtml(profile.logo)}" alt="logo" />` : ""}
        <div class="shop-text">
        <h1>${escapeHtml(profile.shopName || "PackageYar")}</h1>
        <div>
          ${profile.ownerName ? `مدیریت: ${escapeHtml(profile.ownerName)}<br/>` : ""}
          ${profile.phone ? `تلفن: ${escapeHtml(profile.phone)}<br/>` : ""}
          ${profile.address ? `${escapeHtml(profile.address)}` : ""}
        </div>
        </div>
      </div>
      <div class="doc">
        <div class="type">${escapeHtml(doc.docTitle)}</div>
        <div class="meta">
          ${doc.docNumber ? `شماره: ${formatNumber(Number(doc.docNumber))}<br/>` : ""}
          تاریخ: ${escapeHtml(doc.date)}
        </div>
      </div>
    </header>

    <div class="grid">
      <div><span class="lbl">${escapeHtml(doc.partyLabel)}</span><span>${escapeHtml(doc.partyName)}</span></div>
    </div>

    ${extra}
    ${itemsTable}

    <div class="totals">
      ${doc.totals
        .map(
          (t) =>
            `<div class="${t.strong ? "strong" : ""}"><span>${escapeHtml(t.label)}</span><span>${escapeHtml(t.value)}</span></div>`,
        )
        .join("")}
    </div>

    <footer>
      <div class="note">
        ${profile.cardNumber ? `شماره کارت: ${escapeHtml(profile.cardNumber)}<br/>` : ""}
        ${profile.footerNote ? escapeHtml(profile.footerNote) : ""}
      </div>
      <div class="sign">مهر و امضا</div>
    </footer>
  </div>
    <script>
    function closePrintWindow() {
      try { window.close(); } catch (e) {}
    }
    window.onload = function () {
      setTimeout(function () { window.print(); }, 350);
    };
    window.onafterprint = closePrintWindow;
    // بعضی مرورگرهای موبایل afterprint را دیر یا ناقص می‌زنند
    window.addEventListener("focus", function () {
      setTimeout(closePrintWindow, 400);
    });
  </script>
</body>
</html>`);
  win.document.close();
}
