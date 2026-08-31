import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, EmptyState } from "@/components/AppShell";
import type { CustomerPayment } from "@/lib/db";
import { formatMoney, parseNumber, todayJalali } from "@/lib/format";
import { printDocument } from "@/lib/print";
import {
  customerBalance,
  useCustomers,
  usePayments,
  useRemove,
  useRepairs,
  useSales,
  useSave,
} from "@/lib/queries";
import { useShopProfile } from "@/lib/settings";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "دریافت‌ها و بدهکاران — PackageYar" },
      {
        name: "description",
        content: "ثبت پرداخت مشتریان و مشاهده فهرست بدهکاران و مانده حساب‌ها.",
      },
      { property: "og:title", content: "دریافت‌ها و بدهکاران — PackageYar" },
      { property: "og:description", content: "ثبت دریافتی نقدی و پیگیری مانده حساب مشتریان." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/payments" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/payments" }],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const customers = useCustomers().data ?? [];
  const repairs = useRepairs().data ?? [];
  const sales = useSales().data ?? [];
  const { data: payments = [] } = usePayments();
  const save = useSave<CustomerPayment>("customerPayments");
  const remove = useRemove("customerPayments");
  const profile = useShopProfile().data;

  const [customerId, setCustomerId] = useState(0);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("نقدی");

  const debtors = customers
    .map((c) => ({
      customer: c,
      balance: c.id ? customerBalance(c.id, repairs, sales, payments) : 0,
    }))
    .filter((row) => row.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  return (
    <AppShell title="دریافت‌ها" subtitle="ثبت پرداخت و بدهکاران">
      <div className="py-card mb-4 space-y-2 p-4">
        <h2 className="text-sm font-bold">📥 ثبت پرداخت</h2>
        <select
          className="py-field"
          value={customerId}
          onChange={(e) => setCustomerId(Number(e.target.value))}
        >
          <option value={0}>انتخاب مشتری…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          className="py-field"
          inputMode="numeric"
          dir="ltr"
          lang="en"

          placeholder="مبلغ دریافتی"
          onChange={(e) => setAmount(parseNumber(e.target.value))}
        />
        <select className="py-field" value={method} onChange={(e) => setMethod(e.target.value)}>
          {["نقدی", "کارت به کارت", "چک"].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          className="py-btn w-full"
          onClick={() => {
            if (!customerId || amount <= 0) return;
            save.mutate({
              customerId,
              amount,
              method,
              date: todayJalali(),
              relatedType: "manual",
              relatedId: null,
            });
            setAmount(0);
            setCustomerId(0);
          }}
        >
          ثبت پرداخت
        </button>
      </div>

      <h2 className="mb-2 text-sm font-bold">💰 بدهکاران</h2>
      {debtors.length === 0 ? (
        <EmptyState text="هیچ مشتری بدهکاری وجود ندارد ✓" />
      ) : (
        <div className="py-card divide-y divide-border">
          {debtors.map(({ customer, balance }) => (
            <div key={customer.id} className="flex items-center justify-between p-3 text-sm">
              <span>{customer.name}</span>
              <span className="text-destructive">{formatMoney(balance)}</span>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-6 mb-2 text-sm font-bold">📋 آخرین دریافت‌ها</h2>
      {payments.length === 0 ? (
        <EmptyState text="هنوز پرداختی ثبت نشده است." />
      ) : (
        <div className="py-card divide-y divide-border">
          {[...payments].reverse().map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <div>{customers.find((c) => c.id === p.customerId)?.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {p.date} · {p.method}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-success">{formatMoney(p.amount)}</span>
                <button
                  className="text-xs text-primary"
                  onClick={() =>
                    printDocument({
                      docTitle: "رسید پرداخت",
                      docNumber: p.id,
                      partyLabel: "پرداخت‌کننده:",
                      partyName: customers.find((c) => c.id === p.customerId)?.name ?? "—",
                      date: p.date,
                      extraInfo: [{ label: "روش پرداخت:", value: p.method ?? "" }],
                      totals: [
                        { label: "مبلغ دریافتی", value: formatMoney(p.amount), strong: true },
                        {
                          label: "مانده حساب",
                          value: formatMoney(
                            p.customerId
                              ? customerBalance(p.customerId, repairs, sales, payments)
                              : 0,
                          ),
                        },
                      ],
                      profile,
                    })
                  }
                >
                  چاپ رسید
                </button>
                <button
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    if (!p.id) return;
                    const name = customers.find((c) => c.id === p.customerId)?.name ?? "این مشتری";
                    const ok = window.confirm(
                      `حذف پرداخت ${formatMoney(p.amount)} از «${name}»؟\nاین عمل قابل بازگشت نیست.`,
                    );
                    if (ok) remove.mutate(p.id);
                  }}
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
