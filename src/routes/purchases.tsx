import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, EmptyState } from "@/components/AppShell";
import type { PurchaseInvoice, PurchaseInvoiceItem } from "@/lib/db";
import { formatMoney, formatNumber, parseNumber, todayJalali } from "@/lib/format";
import { printDocument } from "@/lib/print";
import { useProducts, usePurchases, useRemove, useSave, useStockDeltas } from "@/lib/queries";
import { useShopProfile } from "@/lib/settings";

export const Route = createFileRoute("/purchases")({
  head: () => ({
    meta: [
      { title: "فاکتور خرید — پکیج‌یار" },
      {
        name: "description",
        content: "ثبت فاکتور خرید قطعات از تأمین‌کننده و ورود موجودی به انبار.",
      },
      { property: "og:title", content: "فاکتور خرید — پکیج‌یار" },
      { property: "og:description", content: "مدیریت خرید قطعات و موجودی انبار." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/purchases" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/purchases" }],
  }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const products = useProducts().data ?? [];
  const { data: invoices = [] } = usePurchases();
  const save = useSave<PurchaseInvoice>("purchaseInvoices");
  const remove = useRemove("purchaseInvoices");
  const stock = useStockDeltas();
  const profile = useShopProfile().data;

  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [paid, setPaid] = useState(0);
  const [items, setItems] = useState<PurchaseInvoiceItem[]>([]);
  const [editing, setEditing] = useState<PurchaseInvoice | null>(null);

  const total = items.reduce((a, i) => a + i.qty * i.price, 0);

  const addProduct = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems((prev) => [
      ...prev,
      { productId, name: product.name, qty: 1, price: product.buyPrice || 0 },
    ]);
  };

  const reset = () => {
    setItems([]);
    setPaid(0);
    setSupplier("");
    setEditing(null);
  };

  const startEdit = (inv: PurchaseInvoice) => {
    setEditing(inv);
    setSupplier(inv.supplier ?? "");
    setPaid(inv.paid || 0);
    setItems(inv.items.map((i) => ({ ...i })));
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = () => {
    if (items.length === 0) return;
    save.mutate({
      ...(editing ?? {}),
      supplier,
      date: editing?.date ?? todayJalali(),
      items,
      total,
      paid,
    });
    stock.mutate([
      ...(editing?.items ?? []).map((i) => ({ productId: i.productId, qty: -i.qty })),
      ...items.map((i) => ({ productId: i.productId, qty: i.qty })),
    ]);
    reset();
    setOpen(false);
  };

  return (
    <AppShell
      title="فاکتور خرید"
      subtitle={`${formatNumber(invoices.length)} فاکتور خرید`}
      action={
        <button
          className="py-btn py-btn-accent"
          onClick={() => {
            reset();
            setOpen((v) => !v);
          }}
        >
          {open ? "بستن" : "+ خرید جدید"}
        </button>
      }
    >
      {open ? (
        <div className="py-card mb-4 space-y-2 p-4">
          <input
            className="py-field"
            placeholder="نام تأمین‌کننده"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />

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

          <div className="flex items-center justify-between text-sm font-bold">
            <span>جمع کل</span>
            <span>{formatMoney(total)}</span>
          </div>
          <input
            className="py-field"
            inputMode="numeric"
            placeholder="مبلغ پرداختی"
            value={paid || ""}
            onChange={(e) => setPaid(parseNumber(e.target.value))}
          />
          <button className="py-btn w-full" onClick={submit}>
            {editing ? "ذخیره تغییرات" : "ثبت فاکتور خرید"}
          </button>
        </div>
      ) : null}

      {invoices.length === 0 ? (
        <EmptyState text="هنوز فاکتور خریدی ثبت نشده است." />
      ) : (
        <div className="py-card divide-y divide-border">
          {[...invoices].reverse().map((inv) => (
            <div key={inv.id} className="space-y-1 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{inv.supplier || "تأمین‌کننده نامشخص"}</span>
                <span className="text-xs text-muted-foreground">{inv.date}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>
                  {formatMoney(inv.total)} · پرداختی {formatMoney(inv.paid)}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    className="text-primary"
                    onClick={() =>
                      printDocument({
                        docTitle: "فاکتور خرید",
                        docNumber: inv.id,
                        partyLabel: "تأمین‌کننده:",
                        partyName: inv.supplier || "تأمین‌کننده نامشخص",
                        date: inv.date,
                        rows: inv.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
                        totals: [
                          { label: "جمع کل", value: formatMoney(inv.total) },
                          { label: "پرداختی", value: formatMoney(inv.paid) },
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
                      stock.mutate(inv.items.map((i) => ({ productId: i.productId, qty: -i.qty })));
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
