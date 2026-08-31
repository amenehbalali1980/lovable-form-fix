import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { formatMoney, formatNumber, todayJalali } from "@/lib/format";
import { printDocument } from "@/lib/print";
import {
  customerBalance,
  useCustomers,
  usePayments,
  useProducts,
  useRepairs,
  useSales,
} from "@/lib/queries";
import { useShopProfile } from "@/lib/settings";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "گزارش‌ها — PackageYar" },
      {
        name: "description",
        content: "گزارش فروش، تعمیرات، بدهکاران و موجودی کم انبار PackageYar.",
      },
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

const REPAIR_STATUS: Record<string, string> = {
  open: "در جریان",
  done: "انجام شد",
  delivered: "تحویل شد",
};

function ReportsPage() {
  const customers = useCustomers().data ?? [];
  const repairs = useRepairs().data ?? [];
  const products = useProducts().data ?? [];
  const sales = useSales().data ?? [];
  const payments = usePayments().data ?? [];
  const profile = useShopProfile().data;
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

  function printCurrentReport() {
    const date = todayJalali();
    if (tab === "overview") {
      printDocument({
        docTitle: "گزارش خلاصه مالی",
        partyLabel: "نوع گزارش:",
        partyName: "خلاصه مالی",
        date,
        totals: [
          { label: "کل فروش", value: formatMoney(totalSales) },
          { label: "دریافتی فروش", value: formatMoney(totalPaidSales) },
          { label: "درآمد تعمیرات", value: formatMoney(totalRepairIncome) },
          { label: "کل دریافتی‌ها", value: formatMoney(totalPayments) },
          { label: "مانده کل مشتریان", value: formatMoney(totalBalance), strong: true },
        ],
        profile,
      });
    } else if (tab === "debtors") {
      printDocument({
        docTitle: "گزارش بدهکاران",
        partyLabel: "نوع گزارش:",
        partyName: "بدهکاران",
        date,
        rows: debtors.map((d) => ({
          name: d.customer.name,
          qty: 1,
          price: d.balance,
        })),
        totals: [
          {
            label: "جمع بدهی",
            value: formatMoney(debtors.reduce((a, d) => a + d.balance, 0)),
            strong: true,
          },
        ],
        profile,
      });
    } else if (tab === "lowstock") {
      printDocument({
        docTitle: "گزارش موجودی کم",
        partyLabel: "نوع گزارش:",
        partyName: "موجودی کم",
        date,
        rows: lowStock.map((p) => ({
          name: p.name,
          qty: p.qty || 0,
          price: p.sellPrice || 0,
        })),
        totals: [{ label: "تعداد اقلام", value: formatNumber(lowStock.length), strong: true }],
        profile,
      });
    } else if (tab === "sales") {
      printDocument({
        docTitle: "گزارش فروش",
        partyLabel: "نوع گزارش:",
        partyName: "فروش",
        date,
        rows: [...sales].reverse().map((s) => ({
          name: `${customers.find((c) => c.id === s.customerId)?.name ?? "متفرقه"} — ${s.date}`,
          qty: 1,
          price: s.total || 0,
        })),
        totals: [
          { label: "کل فروش", value: formatMoney(totalSales) },
          { label: "دریافتی", value: formatMoney(totalPaidSales), strong: true },
        ],
        profile,
      });
    } else if (tab === "repairs") {
      printDocument({
        docTitle: "گزارش تعمیرات",
        partyLabel: "نوع گزارش:",
        partyName: "تعمیرات",
        date,
        rows: [...repairs].reverse().map((r) => ({
          name: `${customers.find((c) => c.id === r.customerId)?.name ?? "—"} — ${r.date}`,
          qty: 1,
          price: (r.wage || 0) + (r.partsCost || 0),
        })),
        totals: [
          { label: "درآمد تعمیرات", value: formatMoney(totalRepairIncome), strong: true },
        ],
        profile,
      });
    }
  }

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

      <div className="mt-3 flex justify-end">
        <button className="py-btn py-btn-accent text-xs" onClick={printCurrentReport}>
          چاپ این گزارش
        </button>
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
                    <button
                      className="mt-1 text-xs text-primary"
                      onClick={() =>
                        printDocument({
                          docTitle: "فاکتور فروش",
                          docNumber: s.id,
                          partyLabel: "مشتری:",
                          partyName:
                            customers.find((c) => c.id === s.customerId)?.name ?? "مشتری متفرقه",
                          date: s.date,
                          rows: (s.items || []).map((i) => ({
                            name: i.name,
                            qty: i.qty,
                            price: i.price,
                          })),
                          totals: [
                            { label: "جمع کل", value: formatMoney(s.total) },
                            { label: "دریافتی", value: formatMoney(s.paid) },
                            {
                              label: "مانده",
                              value: formatMoney((s.total || 0) - (s.paid || 0)),
                              strong: true,
                            },
                          ],
                          profile,
                        })
                      }
                    >
                      چاپ
                    </button>
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
                    <div className="text-xs text-muted-foreground">
                      {REPAIR_STATUS[r.status] ?? r.status}
                    </div>
                    <button
                      className="mt-1 text-xs text-primary"
                      onClick={() =>
                        printDocument({
                          docTitle: "فاکتور تعمیر",
                          docNumber: r.id,
                          partyLabel: "مشتری:",
                          partyName: customers.find((c) => c.id === r.customerId)?.name ?? "—",
                          date: r.date,
                          rows: (r.usedParts || []).map((p) => ({
                            name: p.name,
                            qty: p.qty,
                            price: p.price,
                          })),
                          totals: [
                            { label: "اجرت", value: formatMoney(r.wage || 0) },
                            { label: "هزینه قطعات", value: formatMoney(r.partsCost || 0) },
                            {
                              label: "جمع کل",
                              value: formatMoney((r.wage || 0) + (r.partsCost || 0)),
                              strong: true,
                            },
                          ],
                          extraInfo: [
                            { label: "ایراد:", value: r.problem || "—" },
                            {
                              label: "وضعیت:",
                              value: REPAIR_STATUS[r.status] ?? r.status,
                            },
                          ],
                          profile,
                        })
                      }
                    >
                      چاپ
                    </button>
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