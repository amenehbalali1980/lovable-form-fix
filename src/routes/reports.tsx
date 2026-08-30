import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { formatMoney, formatNumber } from "@/lib/format";
import {
  customerBalance,
  useCustomers,
  usePayments,
  useProducts,
  useRepairs,
  useSales,
} from "@/lib/queries";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "گزارش‌ها — PackageYar" },
      { name: "description", content: "گزارش فروش، تعمیرات، بدهکاران و موجودی کم انبار PackageYar." },
      { property: "og:title", content: "گزارش‌ها — PackageYar" },
      { property: "og:description", content: "گزارش‌های مالی و عملیاتی کسب‌وکار." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/reports" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/reports" }],
  }),
  component: ReportsPage,
});

const TABS = [
  { key: "overview", label: "خلاصه مالی" },
  { key: "debtors", label: "بدهکاران" },
  { key: "lowstock", label: "موجودی کم" },
  { key: "sales", label: "فروش" },
  { key: "repairs", label: "تعمیرات" },
] as const;

function ReportsPage() {
  const customers = useCustomers().data ?? [];
  const repairs = useRepairs().data ?? [];
  const products = useProducts().data ?? [];
  const sales = useSales().data ?? [];
  const payments = usePayments().data ?? [];
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("overview");

  const totalSales = sales.reduce((a, s) => a + (s.total || 0), 0);
  const totalPaidSales = sales.reduce((a, s) => a + (s.paid || 0), 0);
  const totalRepairIncome = repairs.reduce((a, r) => a + (r.wage || 0) + (r.partsCost || 0), 0);
  const totalPayments = payments.reduce((a, p) => a + (p.amount || 0), 0);
  const totalBalance = customers.reduce(
    (a, c) => a + (c.id ? customerBalance(c.id, repairs, sales, payments) : 0),
    0,
  );
  const lowStock = products.filter((p) => (p.qty || 0) <= (p.minQty || 0));
  const debtors = customers
    .map((c) => ({
      customer: c,
      balance: c.id ? customerBalance(c.id, repairs, sales, payments) : 0,
    }))
    .filter((row) => row.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  return (
    <AppShell title="گزارش‌ها" subtitle="گزارش‌های کسب‌وکار">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="py-card p-3">
            <div className="text-xs text-muted-foreground">کل فروش</div>
            <div className="text-sm font-bold">{formatMoney(totalSales)}</div>
          </div>
          <div className="py-card p-3">
            <div className="text-xs text-muted-foreground">دریافتی فروش</div>
            <div className="text-sm font-bold text-success">{formatMoney(totalPaidSales)}</div>
          </div>
          <div className="py-card p-3">
            <div className="text-xs text-muted-foreground">درآمد تعمیرات</div>
            <div className="text-sm font-bold">{formatMoney(totalRepairIncome)}</div>
          </div>
          <div className="py-card p-3">
            <div className="text-xs text-muted-foreground">کل دریافتی‌ها</div>
            <div className="text-sm font-bold text-success">{formatMoney(totalPayments)}</div>
          </div>
          <div className="py-card col-span-2 p-3">
            <div className="text-xs text-muted-foreground">مانده کل مشتریان</div>
            <div className="text-sm font-bold text-destructive">{formatMoney(totalBalance)}</div>
          </div>
        </div>
      )}

      {tab === "debtors" && (
        <div className="mt-4">
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
        </div>
      )}

      {tab === "lowstock" && (
        <div className="mt-4">
          {lowStock.length === 0 ? (
            <EmptyState text="همه کالاها موجودی کافی دارند ✓" />
          ) : (
            <div className="py-card divide-y divide-border">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 text-sm">
                  <span>{p.name}</span>
                  <span className="text-destructive">
                    {formatNumber(p.qty)} {p.unit || "عدد"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "sales" && (
        <div className="mt-4">
          {sales.length === 0 ? (
            <EmptyState text="هنوز فروشی ثبت نشده است." />
          ) : (
            <div className="py-card divide-y divide-border">
              {[...sales].reverse().map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <div>
                      {customers.find((c) => c.id === s.customerId)?.name ?? "مشتری متفرقه"}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.date}</div>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{formatMoney(s.total)}</div>
                    <div className="text-xs text-success">دریافتی {formatMoney(s.paid)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "repairs" && (
        <div className="mt-4">
          {repairs.length === 0 ? (
            <EmptyState text="هنوز تعمیری ثبت نشده است." />
          ) : (
            <div className="py-card divide-y divide-border">
              {[...repairs].reverse().map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <div>{customers.find((c) => c.id === r.customerId)?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.date} · {r.problem || "بدون توضیح"}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">
                      {formatMoney((r.wage || 0) + (r.partsCost || 0))}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
