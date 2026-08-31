import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, EmptyState } from "@/components/AppShell";
import type { Product } from "@/lib/db";
import { formatMoney, formatNumber, parseNumber } from "@/lib/format";
import { useProducts, useRemove, useSave } from "@/lib/queries";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "انبار کالا — PackageYar" },
      {
        name: "description",
        content: "مدیریت موجودی قطعات پکیج، قیمت خرید و فروش و هشدار موجودی کم.",
      },
      { property: "og:title", content: "انبار کالا — PackageYar" },
      { property: "og:description", content: "کنترل موجودی قطعات و قیمت‌ها." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/inventory" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/inventory" }],
  }),
  component: InventoryPage,
});

function emptyProduct(): Product {
  return { name: "", code: "", unit: "عدد", qty: 0, minQty: 1, buyPrice: 0, sellPrice: 0 };
}

function InventoryPage() {
  const { data: products = [] } = useProducts();
  const save = useSave<Product>("products");
  const remove = useRemove("products");
  const [openNew, setOpenNew] = useState(false); // فقط برای کالای جدید
const [editingId, setEditingId] = useState<number | null>(null);
const [search, setSearch] = useState("");
const [form, setForm] = useState<Product>(emptyProduct);

  const filtered = products.filter(
    (p) => p.name.includes(search) || (p.code ?? "").includes(search),
  );
  const totalQty = products.reduce((a, p) => a + (p.qty || 0), 0);

  return (
    <AppShell
      title="انبار"
      subtitle={`${formatNumber(products.length)} کالا · موجودی ${formatNumber(totalQty)}`}
      action={
        <button
          className="py-btn py-btn-accent"
          onClick={() => {
            setForm(emptyProduct());
            setOpenNew((v) => !v);
          }}
        >
          {openNew ? "بستن" : "+ کالای جدید"}
        </button>
      }
    >
      {openNew ? (
        <form
          className="py-card mb-4 space-y-3 p-4"
          onSubmit={(e) => {
  e.preventDefault();
  if (!form.name.trim()) return;
  save.mutate(form);
  setForm(emptyProduct());
  setOpenNew(false);
  setEditingId(null);
}}
        >
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">نام کالا *</label>
            <input
              className="py-field"
              placeholder="مثلاً برد پکیج بوتان"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">کد کالا</label>
              <input
                className="py-field"
                placeholder="اختیاری"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">واحد</label>
              <input
                className="py-field"
                placeholder="عدد"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">موجودی</label>
              <input
                className="py-field"
                inputMode="numeric"
                placeholder="0"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: parseNumber(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">حداقل موجودی</label>
              <input
                className="py-field"
                inputMode="numeric"
                placeholder="1"
                value={form.minQty}
                onChange={(e) => setForm({ ...form, minQty: parseNumber(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">قیمت خرید (تومان)</label>
              <input
                className="py-field"
                inputMode="numeric"
                placeholder="0"
                value={form.buyPrice}
                onChange={(e) => setForm({ ...form, buyPrice: parseNumber(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">قیمت فروش (تومان)</label>
              <input
                className="py-field"
                inputMode="numeric"
                placeholder="0"
                value={form.sellPrice}
                onChange={(e) => setForm({ ...form, sellPrice: parseNumber(e.target.value) })}
              />
            </div>
          </div>
          <button className="py-btn w-full" type="submit">
            ذخیره کالا
          </button>
        </form>
      ) : null}
      <input
        className="py-field mb-3"
        placeholder="🔍 جستجوی کالا"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <EmptyState text="هنوز کالایی در انبار ثبت نشده است." />
      ) : (
        <div className="py-card divide-y divide-border">
          {filtered.map((p) => (
  <div key={p.id} className="border-b border-border last:border-b-0">
    <div className="flex items-center justify-between gap-2 p-3">
      <div>
        <div className="text-sm font-semibold">{p.name}</div>
        <div className="text-xs text-muted-foreground">فروش {formatMoney(p.sellPrice)}</div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span
          className={(p.qty || 0) <= (p.minQty || 0) ? "text-destructive" : "text-success"}
        >
          {formatNumber(p.qty)} {p.unit}
        </span>
        
        <button
          className="text-primary"
          onClick={() => {
            if (editingId === p.id) {
              setEditingId(null);
              setForm(emptyProduct());
            } else {
              setOpenNew(false);
              setForm({ ...p });
              setEditingId(p.id ?? null);
            }
          }}
        >
          {editingId === p.id ? "بستن" : "ویرایش"}
        </button>
        <button
          className="text-muted-foreground"
          onClick={() => p.id && remove.mutate(p.id)}
        >
          حذف
        </button>
      </div>
    </div>

    {/* فرم ویرایش درست زیر همین کالا */}
    {editingId === p.id ? (
      <form
        className="space-y-3 bg-muted/40 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          save.mutate(form);
          setForm(emptyProduct());
          setEditingId(null);
          // اسکرول عمداً جابه‌جا نمی‌شود → روی همان کالا می‌مانی
        }}
      >
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">نام کالا *</label>
          <input
            className="py-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">کد کالا</label>
            <input
              className="py-field"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">واحد</label>
            <input
              className="py-field"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">موجودی</label>
            <input
              className="py-field"
              inputMode="numeric"
              pattern="[0-9]*"
              dir="ltr"
              lang="en"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: parseNumber(e.target.value) })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">حداقل موجودی</label>
            <input
              className="py-field"
              inputMode="numeric"
              dir="ltr"
              lang="en"

              value={form.minQty}
              onChange={(e) => setForm({ ...form, minQty: parseNumber(e.target.value) })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">قیمت خرید</label>
            <input
              className="py-field"
              inputMode="numeric"
              dir="ltr"
                lang="en"

              value={form.buyPrice}
              onChange={(e) => setForm({ ...form, buyPrice: parseNumber(e.target.value) })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">قیمت فروش</label>
            <input
              className="py-field"
              inputMode="numeric"
              dir="ltr"
                lang="en"

              value={form.sellPrice}
              onChange={(e) => setForm({ ...form, sellPrice: parseNumber(e.target.value) })}
            />
          </div>
        </div>
        <button className="py-btn w-full" type="submit">
          ذخیره تغییرات
        </button>
      </form>
    ) : null}
  </div>
))}
        </div>
      )}
    </AppShell>
  );
}
