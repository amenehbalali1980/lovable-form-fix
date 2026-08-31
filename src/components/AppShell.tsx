import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useShopProfile } from "@/lib/settings";

const NAV = [
  { to: "/", label: "داشبورد", icon: "📊" },
  { to: "/customers", label: "مشتریان", icon: "👤" },
  { to: "/repairs", label: "تعمیرات", icon: "🔧" },
  { to: "/inventory", label: "انبار", icon: "📦" },
  { to: "/sales", label: "فروش", icon: "🧾" },
  { to: "/payments", label: "دریافت", icon: "📥" },
  { to: "/reports", label: "گزارش", icon: "📈" },
  { to: "/settings", label: "تنظیمات", icon: "⚙️" },
] as const;

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { data: profile } = useShopProfile();
  const banner = profile?.headerBanner?.trim();

  return (
    <div className="min-h-screen bg-background pb-24">
      {banner ? (
        <div className="w-full bg-primary">
          <img
            src={banner}
            alt="بنر"
            className="mx-auto block h-24 w-full max-w-3xl object-cover"
          />
        </div>
      ) : null}

      <header className="sticky top-0 z-20 border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold">{title}</h1>
            {subtitle ? <p className="text-xs opacity-80">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-stretch justify-between px-1 py-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-primary font-bold" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-md py-2 text-[0.68rem]"
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-card px-4 py-10 text-center text-sm text-muted-foreground">{text}</div>
  );
}