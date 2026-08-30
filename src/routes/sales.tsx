import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell, EmptyState } from "@/components/AppShell";
import type { SalesInvoice, SalesInvoiceItem } from "@/lib/db";
import { formatMoney, formatNumber, parseNumber, todayJalali } from "@/lib/format";
import { printDocument } from "@/lib/print";
import {
  useCustomers,
  useProducts,
  useRemove,
  useSales,
  useSave,
  useStockDeltas,
} from "@/lib/queries";
import { checkStock } from "@/lib/stock";

import { useShopProfile } from "@/lib/settings";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "فاکتور فروش — PackageYar" },
      {
        name: "description",
        content: "صدور فاکتور فروش قطعات، ثبت مبلغ دریافتی و مشاهده فاکتورهای گذشته.",
      },
      { property: "og:title", content: "فاکتور فروش — PackageYar" },
      { property: "og:description", content: "صدور و مدیریت فاکتورهای فروش." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/sales" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/sales" }],
  }),
  component: SalesPage,
});

function SalesPage() {
  const customers = useCustomers().data ?? [];
  const products = useProducts().data ?? [];
  const { data: invoices = [] } = useSales();
  const save = useSave<SalesInvoice>("salesInvoices");
  const remove = useRemove("salesInvoices");
  const stock = useStockDeltas();
  const profile = useShopProfile().data;

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [paid, setPaid] = useState(0);
  const [items, setItems] = useState<SalesInvoiceItem[]>([]);
  const [editing, setEditing] = useState<SalesInvoice | null>(null);

  const total = items.reduce((a, i) => a + i.qty * i.price, 0);
  // هر وقت جمع فاکتور عوض شد، مبلغ دریافتی را با آن هماهنگ کن
  useEffect(() => {
    setPaid(total);
  }, [total]);
  const stockIssues = checkStock(items, products, editing?.items ?? []);

  const addProduct = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems((prev) => [
      ...prev,
      { productId, name: product.name, qty: 1, price: product.sellPrice || 0 },
    ]);
  };

  const reset = () => {
    setItems([]);
    setPaid(0);
    setCustomerId(null);
    setEditing(null);
  };

  const startEdit = (inv: SalesInvoice) => {
    setEditing(inv);
    setCustomerId(inv.customerId ?? null);
    setPaid(inv.paid || 0);
    setItems(inv.items.map((i) => ({ ...i })));
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = () => {
    if (items.length === 0) return;
    save.mutate({
      ...(editing ?? {}),
      customerId,
      date: editing?.date ?? todayJalali(),
      items,
      total,
      paid,
    });
    stock.mutate([
      ...(editing?.items ?? []).map((i) => ({ productId: i.productId, qty: i.qty })),
      ...items.map((i) => ({ productId: i.productId, qty: -i.qty })),
    ]);
    reset();
    setOpen(false);
  };

  return (
    <AppShell
      title="فروش"
      subtitle={`${formatNumber(invoices.length)} فاکتور`}
      action={
        <button
          className="py-btn py-btn-accent"
          onClick={() => {
            reset();
            setOpen((v) => !v);
          }}
        >
          {open ? "بستن" : "+ فاکتور جدید"}
        </button>
      }
    >
      {open ? (
        <div className="py-card mb-4 space-y-2 p-4">
          <select
            className="py-field"
            value={customerId ?? 0}
            onChange={(e) => setCustomerId(Number(e.target.value) || null)}
          >
            <option value={0}>مشتری متفرقه</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="py-field"
            value={0}
            onChange={(e) => addProduct(Number(e.target.value))}
          >
            <option value={0}>+ افزودن کالا به فاکتور…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2 rounded-md bg-muted p-2 text-xs">
              <span className="flex-1">{item.name}</span>
              <input
                className="py-field w-16 py-1"
                inputMode="numeric"
                value={item.qty}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it, i) =>
                      i === index ? { ...it, qty: parseNumber(e.target.value) } : it,
                    ),
                  )
                }
              />
              <input
                className="py-field w-24 py-1"
                inputMode="numeric"
                value={item.price}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it, i) =>
                      i === index ? { ...it, price: parseNumber(e.target.value) } : it,
                    ),
                  )
                }
              />
              <button onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}>
                ✕
              </button>
            </div>
          ))}

          {stockIssues.length > 0 ? (
            <ul className="space-y-1 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-foreground">
              {stockIssues.map((issue) => (
                <li key={issue.productId}>
                  {issue.level === "out" ? "⛔️ " : "⚠️ "}
                  {issue.message}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex items-center justify-between text-sm font-bold">
            <span>جمع کل</span>
            <span>{formatMoney(total)}</span>
          </div>
          <input
            className="py-field"
            inputMode="numeric"
            placeholder="مبلغ دریافتی"
            value={paid || ""}
            onChange={(e) => setPaid(parseNumber(e.target.value))}
          />
          <button className="py-btn w-full" onClick={submit}>
            {editing ? "ذخیره تغییرات" : "ثبت فاکتور"}
          </button>
        </div>
      ) : null}

      {invoices.length === 0 ? (
        <EmptyState text="هنوز فاکتور فروشی ثبت نشده است." />
      ) : (
        <div className="py-card divide-y divide-border">
          {[...invoices].reverse().map((inv) => (
            <div key={inv.id} className="space-y-1 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {customers.find((c) => c.id === inv.customerId)?.name ?? "مشتری متفرقه"}
                </span>
                <span className="text-xs text-muted-foreground">{inv.date}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>
                  {formatMoney(inv.total)} · دریافتی {formatMoney(inv.paid)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="text-primary"
                    onClick={() =>
                      printDocument({
                        docTitle: "فاکتور فروش",
                        docNumber: inv.id,
                        partyLabel: "مشتری:",
                        partyName:
                          customers.find((c) => c.id === inv.customerId)?.name ?? "مشتری متفرقه",
                        date: inv.date,
                        rows: inv.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
                        totals: [
                          { label: "جمع کل", value: formatMoney(inv.total) },
                          { label: "دریافتی", value: formatMoney(inv.paid) },
                          {
                            label: "مانده",
                            value: formatMoney(inv.total - inv.paid),
                            strong: true,
                          },
                        ],
                        profile,
                      })
                    }
                  >
                    چاپ
                  </button>
                  <button className="text-primary" onClick={() => startEdit(inv)}>
                    ویرایش
                  </button>
                  <button
                    className="text-muted-foreground"
                    onClick={() => {
                      if (!inv.id) return;
                      const ok = window.confirm(
                        "آیا از حذف این فاکتور مطمئن هستید؟\n" +
                          "• موجودی کالاها به انبار برمی‌گردد.\n" +
                          "• مبلغ دریافتی داخل فاکتور از حساب کم می‌شود.\n" +
                          "• پرداخت‌های جداگانه در بخش «دریافت» پاک نمی‌شوند.",
                      );
                      if (!ok) return;
                      stock.mutate(inv.items.map((i) => ({ productId: i.productId, qty: i.qty })));
                      remove.mutate(inv.id);
                    }}
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
