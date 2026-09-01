import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { formatMoney, formatNumber, todayJalali, todayJalaliWithWeekday } from "@/lib/format";
import {
  customerBalance,
  useCustomers,
  usePayments,
  useProducts,
  useRepairs,
  useSales,
} from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PackageYar — مدیریت تعمیرکار پکیج" },
      {
        name: "description",
        content:
          "مدیریت مشتریان، تعمیرات، انبار و فاکتورهای فروش برای تعمیرکاران پکیج، آفلاین و قابل نصب روی موبایل و ویندوز.",
      },
      { property: "og:title", content: "PackageYar — مدیریت تعمیرکار پکیج" },
      {
        property: "og:description",
        content: "داشبورد فروش، تعمیرات، بدهکاران و انبار در یک اپ آفلاین.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Dashboard,
});

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="py-card p-3">
      <div className="text-xl">{icon}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
/** ۷ روز اخیر به شمسی (از ۶ روز قبل تا امروز) */
function last7JalaliDays(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(todayJalali(d));
  }
  return days;
}

/** برچسب کوتاه محور X مثل 06/09 */
function shortJalali(date: string): string {
  const parts = date.split("/");
  if (parts.length < 3) return date;
  return `${parts[1]}/${parts[2]}`;
}
function Dashboard() {
  const today = todayJalali();
  const customers = useCustomers().data ?? [];
  const repairs = useRepairs().data ?? [];
  const products = useProducts().data ?? [];
  const sales = useSales().data ?? [];
  const payments = usePayments().data ?? [];
    const [q, setQ] = useState("");

  const searchResults = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];

    type Hit = {
      key: string;
      kind: string;
      title: string;
      subtitle?: string | undefined;
      to: string;
      params?: Record<string, string> | undefined;
    };

    const hits: Hit[] = [];

    for (const c of customers) {
      const hay = `${c.name} ${c.phone ?? ""} ${c.address ?? ""}`.toLowerCase();
      if (hay.includes(term) && c.id != null) {
        hits.push({
          key: `c-${c.id}`,
          kind: "مشتری",
          title: c.name,
          subtitle: c.phone || undefined,
          to: "/customers/$customerId",
          params: { customerId: String(c.id) },
        });
      }
    }

    for (const p of products) {
      const hay = `${p.name} ${p.code ?? ""}`.toLowerCase();
      if (hay.includes(term)) {
        hits.push({
          key: `p-${p.id}`,
          kind: "کالا",
          title: p.name,
          subtitle: p.code || undefined,
          to: "/inventory",
        });
      }
    }

    for (const s of sales) {
      const customerName =
        customers.find((c) => c.id === s.customerId)?.name ?? "مشتری متفرقه";
      const itemsText = (s.items || []).map((i) => i.name).join(" ");
      const hay = `${customerName} ${s.date} ${itemsText}`.toLowerCase();
      if (hay.includes(term)) {
        hits.push({
          key: `s-${s.id}`,
          kind: "فاکتور فروش",
          title: customerName,
          subtitle: `${s.date} · ${formatMoney(s.total || 0)}`,
          to: "/sales",
        });
      }
    }

    for (const r of repairs) {
      const customerName =
        customers.find((c) => c.id === r.customerId)?.name ?? "—";
      const hay = `${customerName} ${r.date} ${r.problem ?? ""} ${r.action ?? ""}`.toLowerCase();
      if (hay.includes(term)) {
        hits.push({
          key: `r-${r.id}`,
          kind: "تعمیر",
          title: customerName,
          subtitle: `${r.date} · ${r.problem || "بدون توضیح"}`,
          to: "/repairs",
        });
      }
    }

    return hits.slice(0, 20);
  }, [q, customers, products, sales, repairs]);
  const todaySales = sales.filter((s) => s.date === today).reduce((a, s) => a + (s.total || 0), 0);
  const todayRepairs = repairs.filter((r) => r.date === today);
  const todayIncome = payments
    .filter((p) => p.date === today)
    .reduce((a, p) => a + (p.amount || 0), 0);
  const totalBalance = customers.reduce(
    (a, c) => a + (c.id ? customerBalance(c.id, repairs, sales, payments) : 0),
    0,
  );
  const lowStock = products.filter((p) => (p.qty || 0) <= (p.minQty || 0));
    // تعمیرات در جریان
  const openRepairs = repairs.filter((r) => r.status === "open");

  // ۵ بدهکار برتر
  const topDebtors = useMemo(() => {
    return customers
      .map((c) => ({
        id: c.id,
        name: c.name,
        balance: c.id ? customerBalance(c.id, repairs, sales, payments) : 0,
      }))
      .filter((row) => row.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);
  }, [customers, repairs, sales, payments]);

  // نمودار فروش ۷ روز اخیر
  const salesLast7 = useMemo(() => {
    const days = last7JalaliDays();
    return days.map((day) => ({
      day,
      label: shortJalali(day),
      total: sales
        .filter((s) => s.date === day)
        .reduce((sum, s) => sum + (s.total || 0), 0),
    }));
  }, [sales]);
  return (
    
    <AppShell title="پکیج یار" subtitle={`امروز ${todayJalaliWithWeekday()}`}>
            <div className="mb-4">
        <input
          className="py-field"
          placeholder="🔍 جستجو در مشتریان، کالاها، فاکتورها و تعمیرات…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q.trim().length >= 2 ? (
          <div className="py-card mt-2 max-h-64 overflow-auto divide-y divide-border">
            {searchResults.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">نتیجه‌ای پیدا نشد</p>
            ) : (
              searchResults.map((hit) => {
                if (hit.to === "/customers/$customerId" && hit.params?.["customerId"]) {
                  return (
                    <Link
                      key={hit.key}
                      to="/customers/$customerId"
                      params={{ customerId: hit.params["customerId"] }}
                      onClick={() => setQ("")}
                      className="flex items-start justify-between gap-2 p-3 text-sm"
                    >
                      <div>
                        <div className="font-semibold">{hit.title}</div>
                        {hit.subtitle ? (
                          <div className="text-xs text-muted-foreground">{hit.subtitle}</div>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[0.65rem]">
                        {hit.kind}
                      </span>
                    </Link>
                  );
                }
                if (hit.to === "/inventory") {
                  return (
                    <Link
                      key={hit.key}
                      to="/inventory"
                      onClick={() => setQ("")}
                      className="flex items-start justify-between gap-2 p-3 text-sm"
                    >
                      <div>
                        <div className="font-semibold">{hit.title}</div>
                        {hit.subtitle ? (
                          <div className="text-xs text-muted-foreground">{hit.subtitle}</div>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[0.65rem]">
                        {hit.kind}
                      </span>
                    </Link>
                  );
                }
                if (hit.to === "/sales") {
                  return (
                    <Link
                      key={hit.key}
                      to="/sales"
                      onClick={() => setQ("")}
                      className="flex items-start justify-between gap-2 p-3 text-sm"
                    >
                      <div>
                        <div className="font-semibold">{hit.title}</div>
                        {hit.subtitle ? (
                          <div className="text-xs text-muted-foreground">{hit.subtitle}</div>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[0.65rem]">
                        {hit.kind}
                      </span>
                    </Link>
                  );
                }
                return (
                  <Link
                    key={hit.key}
                    to="/repairs"
                    onClick={() => setQ("")}
                    className="flex items-start justify-between gap-2 p-3 text-sm"
                  >
                    <div>
                      <div className="font-semibold">{hit.title}</div>
                      {hit.subtitle ? (
                        <div className="text-xs text-muted-foreground">{hit.subtitle}</div>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[0.65rem]">
                      {hit.kind}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat icon="💰" label="فروش امروز" value={formatMoney(todaySales)} />
        <Stat icon="🔧" label="تعمیرات امروز" value={`${formatNumber(todayRepairs.length)} مورد`} />
        <Stat
          icon="📥"
          label="دریافتی امروز"
          value={formatMoney(todayIncome)}
          tone="text-success"
        />
        <Stat
          icon="⚠️"
          label="مانده کل مشتریان"
          value={formatMoney(totalBalance)}
          tone="text-destructive"
        />
      </div>
        <div className="mt-3"></div>
            <Stat
          icon="🛠️"
          label="تعمیرات در جریان"
          value={`${formatNumber(openRepairs.length)} مورد`}
          tone="text-warning"
        />
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { label: "مشتریان", value: customers.length, to: "/customers" as const },
          { label: "تعمیرات", value: repairs.length, to: "/repairs" as const },
          { label: "کالاها", value: products.length, to: "/inventory" as const },
          { label: "فاکتورها", value: sales.length, to: "/sales" as const },
        ].map((item) => (
          <Link key={item.label} to={item.to} className="py-card p-3 text-center">
            <div className="text-base font-bold">{formatNumber(item.value)}</div>
            <div className="text-[0.68rem] text-muted-foreground">{item.label}</div>
          </Link>
        ))}
      </div>

      <h2 className="mt-6 mb-2 text-sm font-bold">دسترسی سریع</h2>
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: "🧾", label: "فاکتور فروش", to: "/sales" as const },
          { icon: "🛒", label: "فاکتور خرید", to: "/purchases" as const },
          { icon: "🔧", label: "ثبت تعمیر", to: "/repairs" as const },
          { icon: "📥", label: "ثبت پرداخت", to: "/payments" as const },
          { icon: "👤", label: "مشتری جدید", to: "/customers" as const },
          { icon: "📦", label: "انبار", to: "/inventory" as const },
          
          
        ].map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="py-card flex flex-col items-center gap-1 p-3 text-xs"
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
            {/* ۵ بدهکار برتر */}
      <h2 className="mt-6 mb-2 text-sm font-bold">💳 بدهکاران برتر</h2>
      <div className="py-card divide-y divide-border">
        {topDebtors.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">بدهکاری ثبت نشده ✓</p>
        ) : (
          topDebtors.map((d) => (
            <Link
              key={d.id}
              to="/customers/$customerId"
              params={{ customerId: String(d.id) }}
              className="flex items-center justify-between p-3 text-sm"
            >
              <span>{d.name}</span>
              <span className="font-semibold text-destructive">{formatMoney(d.balance)}</span>
            </Link>
          ))
        )}
      </div>

      {/* نمودار فروش ۷ روز */}
      <h2 className="mt-6 mb-2 text-sm font-bold">📈 فروش ۷ روز اخیر</h2>
      <div className="py-card p-3">
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesLast7} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                width={40}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => formatNumber(Number(v))}
              />
              <Tooltip
                formatter={(value) => formatMoney(Number(value ?? 0))}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as { day?: string } | undefined;
                  return row?.day ?? "";
                }}
              />
              <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>  
      <h2 className="mt-6 mb-2 text-sm font-bold">⚠️ موجودی کم</h2>
      <div className="py-card divide-y divide-border">
        {lowStock.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">همه کالاها موجودی کافی دارند ✓</p>
        ) : (
          lowStock.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 text-sm">
              <span>{p.name}</span>
              <span className="text-destructive">
                {formatNumber(p.qty)} {p.unit || "عدد"}
              </span>
            </div>
          ))
        )}
      </div>

      <h2 className="mt-6 mb-2 text-sm font-bold">🔧 آخرین تعمیرات</h2>
      <div className="py-card divide-y divide-border">
        {repairs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">هنوز تعمیری ثبت نشده است.</p>
        ) : (
          repairs
            .slice(-5)
            .reverse()
            .map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 text-sm">
                <span>{customers.find((c) => c.id === r.customerId)?.name ?? "—"}</span>
                <span className="text-muted-foreground">{r.date}</span>
              </div>
            ))
        )}
      </div>
    </AppShell>
  );
}
