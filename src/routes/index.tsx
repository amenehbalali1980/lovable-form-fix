import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { formatMoney, formatNumber, todayJalali } from "@/lib/format";
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

function Dashboard() {
  const today = todayJalali();
  const customers = useCustomers().data ?? [];
  const repairs = useRepairs().data ?? [];
  const products = useProducts().data ?? [];
  const sales = useSales().data ?? [];
  const payments = usePayments().data ?? [];

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

  return (
    <AppShell title="PackageYar" subtitle={`امروز ${today}`}>
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
          { icon: "👤", label: "مشتری جدید", to: "/customers" as const },
          { icon: "🔧", label: "ثبت تعمیر", to: "/repairs" as const },
          { icon: "🧾", label: "فاکتور فروش", to: "/sales" as const },
          { icon: "📦", label: "انبار", to: "/inventory" as const },
          { icon: "📥", label: "ثبت پرداخت", to: "/payments" as const },
          { icon: "⚙️", label: "تنظیمات", to: "/settings" as const },
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
