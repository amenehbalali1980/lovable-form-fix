import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  addRecord,
  DB_NAME,
  DB_VERSION,
  exportAll,
  getAll,
  importAll,
  type Customer,
  type Product,
} from "@/lib/db";
import { downloadCsv, parseCsv, toCsv } from "@/lib/csv";
import { parseNumber, todayJalali } from "@/lib/format";
import {
  emptyShopProfile,
  useSaveShopProfile,
  useShopProfile,
  type ShopProfile,
} from "@/lib/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "تنظیمات و پشتیبان‌گیری — PackageYar" },
      {
        name: "description",
        content: "وضعیت دیتابیس، تهیه فایل پشتیبان و بازگردانی اطلاعات PackageYar.",
      },
      { property: "og:title", content: "تنظیمات و پشتیبان‌گیری — PackageYar" },
      { property: "og:description", content: "پشتیبان‌گیری، بازگردانی و اطلاعات نسخه اپ." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/settings" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/settings" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const mdRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);
  const csvTargetRef = useRef<"products" | "customers">("products");

  const [message, setMessage] = useState("");
  const [installable, setInstallable] = useState(false);
  const promptRef = useRef<{ prompt: () => void } | null>(null);
  const shopQuery = useShopProfile();
  const saveShop = useSaveShopProfile();
  const [shop, setShop] = useState<ShopProfile>(emptyShopProfile);
  const [shopLoaded, setShopLoaded] = useState(false);

  useEffect(() => {
    if (shopQuery.data && !shopLoaded) {
      setShop(shopQuery.data);
      setShopLoaded(true);
    }
  }, [shopQuery.data, shopLoaded]);

  const shopFields: { key: keyof ShopProfile; label: string }[] = [
    { key: "shopName", label: "نام مغازه" },
    { key: "ownerName", label: "نام مدیر" },
    { key: "phone", label: "تلفن" },
    { key: "address", label: "آدرس" },
    { key: "cardNumber", label: "شماره کارت / شبا" },
    { key: "footerNote", label: "یادداشت پایین فاکتور" },
  ];

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as unknown as { prompt: () => void };
      setInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const backup = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `packageyar-backup-${todayJalali().replace(/\//g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("فایل پشتیبان ساخته شد ✓");
  };

  const restore = async (file: File) => {
    const text = await file.text();
    await importAll(JSON.parse(text));
    await qc.invalidateQueries();
    setMessage("اطلاعات بازگردانی شد ✓");
  };

  const importMarkdown = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    let imported = 0;

    for (const line of lines) {
      let trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      // رد کردن جداکننده جدول مثل |---|---|
      if (/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(trimmed)) continue;

      // اگر جدول markdown است، | ابتدا و انتها را بردار
      if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
      if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);

      const parts = trimmed
        .split("|")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      if (parts.length < 2) continue;

      // رد کردن ردیف هدر (اگر اولین ستون «نام» یا name باشد)
      const first = parts[0]!.toLowerCase();
      if (first === "نام" || first === "name" || first === "نام کالا") continue;

      const name = parts[0] ?? "";
      if (!name) continue;

      const qty = parseNumber(parts[1] ?? "");
      const buyPrice = parts[2] ? parseNumber(parts[2]) : 0;
      const sellPrice = parts[3] ? parseNumber(parts[3]) : buyPrice;

      const product: Product = {
        name,
        code: "",
        unit: "عدد",
        qty: qty || 0,
        minQty: 1,
        buyPrice,
        sellPrice,
        createdAt: new Date().toISOString(),
      };
      await addRecord("products", product);
      imported++;
    }

    await qc.invalidateQueries();
    setMessage(
      imported > 0
        ? `${imported} کالا از Markdown وارد شد ✓`
        : "هیچ کالایی پیدا نشد. فرمت فایل را بررسی کنید.",
    );
  };

  const exportCsv = async (store: "products" | "customers" | "repairs" | "salesInvoices") => {
    const rows = (await getAll<Record<string, unknown>>(store)) ?? [];
    downloadCsv(`packageyar-${store}-${todayJalali().replace(/\//g, "-")}.csv`, toCsv(rows));
    setMessage("فایل CSV ساخته شد ✓");
  };

  const importCsv = async (file: File) => {
    const rows = parseCsv(await file.text());
    const target = csvTargetRef.current;
    let imported = 0;
    for (const row of rows) {
      const name = row["name"] || row["نام"] || "";
      if (!name) continue;
      if (target === "products") {
        const product: Product = {
          name,
          code: row["code"] ?? "",
          unit: row["unit"] || "عدد",
          qty: parseNumber(row["qty"] ?? "0"),
          minQty: parseNumber(row["minQty"] ?? "1") || 1,
          buyPrice: parseNumber(row["buyPrice"] ?? "0"),
          sellPrice: parseNumber(row["sellPrice"] ?? "0"),
          createdAt: new Date().toISOString(),
        };
        await addRecord("products", product);
      } else {
        await addRecord("customers", {
          name,
          phone: row["phone"] ?? "",
          address: row["address"] ?? "",
          note: row["note"] ?? "",
          createdAt: new Date().toISOString(),
        } satisfies Customer);
      }
      imported++;
    }
    await qc.invalidateQueries();
    setMessage(`${imported} ردیف از CSV وارد شد ✓`);
  };

  return (
    <AppShell title="تنظیمات" subtitle="PackageYar نسخه ۱٫۰">
      <div className="py-card space-y-2 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">وضعیت دیتابیس</span>
          <span className="text-success">فعال ✓</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">نام دیتابیس</span>
          <span>{DB_NAME}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">نسخه دیتابیس</span>
          <span>{DB_VERSION}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">حالت کار</span>
          <span>آفلاین روی همین دستگاه</span>
        </div>
      </div>

      <div className="py-card mt-4 space-y-2 p-4">
        <h2 className="text-sm font-bold">🏪 اطلاعات مغازه</h2>
        <p className="text-xs text-muted-foreground">
          این اطلاعات در سربرگ فاکتورها و رسیدهای چاپی نمایش داده می‌شود.
        </p>
        {shopFields.map((f) => (
          <input
            key={f.key}
            className="py-field"
            placeholder={f.label}
            value={shop[f.key]}
            onChange={(e) => setShop((prev) => ({ ...prev, [f.key]: e.target.value }))}
          />
        ))}

        <div className="flex items-center gap-3 pt-1">
          {shop.logo ? (
            <img
              src={shop.logo}
              alt="لوگوی مغازه"
              className="h-14 w-14 rounded-md border object-contain"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-md border text-xs text-muted-foreground">
              بدون لوگو
            </div>
          )}
          <div className="flex flex-1 gap-2">
            <button className="py-btn py-btn-soft flex-1" onClick={() => logoRef.current?.click()}>
              بارگذاری لوگو
            </button>
            {shop.logo ? (
              <button
                className="py-btn py-btn-soft"
                onClick={() => setShop((p) => ({ ...p, logo: "" }))}
              >
                حذف
              </button>
            ) : null}
          </div>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setShop((p) => ({ ...p, logo: String(reader.result ?? "") }));
              reader.readAsDataURL(file);
              e.target.value = "";
            }}
          />
        </div>
        <div className="space-y-2 border-t border-border pt-3">
  <p className="text-xs text-muted-foreground">
    بنر هدر فقط بالای اپ نمایش داده می‌شود. در چاپ فاکتور فقط لوگو استفاده می‌شود.
  </p>
  {shop.headerBanner ? (
    <img
      src={shop.headerBanner}
      alt="بنر هدر"
      className="h-20 w-full rounded-md border object-cover"
    />
  ) : (
    <div className="flex h-16 items-center justify-center rounded-md border text-xs text-muted-foreground">
      بدون بنر
    </div>
  )}
  <div className="flex gap-2">
    <button className="py-btn py-btn-soft flex-1" onClick={() => bannerRef.current?.click()}>
      بارگذاری بنر هدر
    </button>
    {shop.headerBanner ? (
      <button
        className="py-btn py-btn-soft"
        onClick={() => setShop((p) => ({ ...p, headerBanner: "" }))}
      >
        حذف
      </button>
    ) : null}
  </div>
  <input
    ref={bannerRef}
    type="file"
    accept="image/*"
    className="hidden"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () =>
        setShop((p) => ({ ...p, headerBanner: String(reader.result ?? "") }));
      reader.readAsDataURL(file);
      e.target.value = "";
    }}
  />
</div>
<div className="space-y-2 border-t border-border pt-3">
  <p className="text-xs text-muted-foreground">
    تصویر مهر در پایین فاکتورها و رسیدهای چاپی، کنار «مهر و امضا» نمایش داده می‌شود.
  </p>
  {shop.stamp ? (
    <img
      src={shop.stamp}
      alt="مهر"
      className="h-20 w-20 rounded-md border object-contain"
    />
  ) : (
    <div className="flex h-20 w-20 items-center justify-center rounded-md border text-xs text-muted-foreground">
      بدون مهر
    </div>
  )}
  <div className="flex gap-2">
    <button className="py-btn py-btn-soft flex-1" onClick={() => stampRef.current?.click()}>
      بارگذاری مهر
    </button>
    {shop.stamp ? (
      <button
        className="py-btn py-btn-soft"
        onClick={() => setShop((p) => ({ ...p, stamp: "" }))}
      >
        حذف
      </button>
    ) : null}
  </div>
  <input
    ref={stampRef}
    type="file"
    accept="image/*"
    className="hidden"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setShop((p) => ({ ...p, stamp: String(reader.result ?? "") }));
      reader.readAsDataURL(file);
      e.target.value = "";
    }}
  />
</div>
        <button
          className="py-btn w-full"
          onClick={() => {
            saveShop.mutate(shop);
            setMessage("اطلاعات مغازه ذخیره شد ✓");
          }}
        >
          ذخیره اطلاعات مغازه
        </button>
      </div>

      <div className="py-card mt-4 space-y-2 p-4">
        <h2 className="text-sm font-bold">💾 پشتیبان‌گیری</h2>
        <button className="py-btn w-full" onClick={backup}>
          دریافت فایل پشتیبان
        </button>
        <button className="py-btn py-btn-soft w-full" onClick={() => fileRef.current?.click()}>
          بازگردانی از فایل
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void restore(file);
          }}
        />
        {message ? <p className="text-xs text-success">{message}</p> : null}
      </div>

      <div className="py-card mt-4 space-y-2 p-4">
        <h2 className="text-sm font-bold">📊 خروجی / ورودی CSV</h2>
        <p className="text-xs text-muted-foreground">
          مناسب باز کردن در اکسل. ستون‌های کالا: name, code, unit, qty, minQty, buyPrice, sellPrice
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button className="py-btn py-btn-soft" onClick={() => void exportCsv("products")}>
            خروجی کالاها
          </button>
          <button className="py-btn py-btn-soft" onClick={() => void exportCsv("customers")}>
            خروجی مشتریان
          </button>
          <button className="py-btn py-btn-soft" onClick={() => void exportCsv("repairs")}>
            خروجی تعمیرات
          </button>
          <button className="py-btn py-btn-soft" onClick={() => void exportCsv("salesInvoices")}>
            خروجی فروش
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            className="py-btn py-btn-soft"
            onClick={() => {
              csvTargetRef.current = "products";
              csvRef.current?.click();
            }}
          >
            ورود کالا (CSV)
          </button>
          <button
            className="py-btn py-btn-soft"
            onClick={() => {
              csvTargetRef.current = "customers";
              csvRef.current?.click();
            }}
          >
            ورود مشتری (CSV)
          </button>
        </div>
        <input
          ref={csvRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importCsv(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="py-card mt-4 space-y-2 p-4">
        <h2 className="text-sm font-bold">📄 ورود کالا از Markdown</h2>
        <p className="text-xs text-muted-foreground">
          هر خط به شکل: نام کالا | تعداد | قیمت خرید | قیمت فروش
        </p>
        <button className="py-btn py-btn-soft w-full" onClick={() => mdRef.current?.click()}>
          انتخاب فایل Markdown
        </button>
        <input
          ref={mdRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importMarkdown(file);
          }}
        />
      </div>

      {installable ? (
        <div className="py-card mt-4 space-y-2 p-4">
          <h2 className="text-sm font-bold">📲 نصب اپ</h2>
          <p className="text-xs text-muted-foreground">
            PackageYar را روی صفحه اصلی گوشی یا دسکتاپ ویندوز نصب کنید.
          </p>
          <button
            className="py-btn py-btn-accent w-full"
            onClick={() => promptRef.current?.prompt()}
          >
            نصب PackageYar
          </button>
        </div>
      ) : (
        <div className="py-card mt-4 p-4 text-xs text-muted-foreground">
          برای نصب روی آیفون: در سافاری دکمه اشتراک‌گذاری → «افزودن به صفحه اصلی». روی اندروید و
          ویندوز: منوی مرورگر → «نصب برنامه».
        </div>
      )}
    </AppShell>
  );
}
