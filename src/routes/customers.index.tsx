import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, EmptyState } from "@/components/AppShell";
import type { Customer } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import {
  customerBalance,
  useCustomers,
  usePayments,
  useRemoveCustomer,
  useRepairs,
  useSales,
  useSave,
} from "@/lib/queries";

export const Route = createFileRoute("/customers/")({
  head: () => ({
    meta: [
      { title: "مشتریان — پکیج‌یار" },
      {
        name: "description",
        content: "فهرست مشتریان، شماره تماس و مانده حساب هر مشتری در پکیج‌یار.",
      },
      { property: "og:title", content: "مشتریان — پکیج‌یار" },
      { property: "og:description", content: "مدیریت مشتریان و مانده حساب آن‌ها." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/customers" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/customers" }],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { data: customers = [] } = useCustomers();
  const repairs = useRepairs().data ?? [];
  const sales = useSales().data ?? [];
  const payments = usePayments().data ?? [];
  const save = useSave<Customer>("customers");
  const removeCustomer = useRemoveCustomer();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Customer>({ name: "", phone: "", address: "", note: "" });

  const filtered = customers
    .filter((c) => c.name.includes(search) || (c.phone ?? "").includes(search))
    .slice()
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  function handleDelete(c: Customer) {
    if (!c.id) return;
    const ok = window.confirm(
      `آیا از حذف «${c.name}» مطمئن هستید؟\nدستگاه‌ها و تعمیرات مرتبط نیز حذف می‌شوند.`,
    );
    if (!ok) return;
    removeCustomer.mutate(c.id);
  }

  return (
    <AppShell
      title="مشتریان"
      subtitle={`${customers.length} مشتری ثبت شده`}
      action={
        <button
          className="py-btn py-btn-accent"
          onClick={() => {
            setForm({ name: "", phone: "", address: "", note: "" });
            setOpen((v) => !v);
          }}
        >
          {open ? "بستن" : "+ مشتری جدید"}
        </button>
      }
    >
      {open ? (
        <form
          className="py-card mb-4 space-y-2 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            save.mutate(form);
            setForm({ name: "", phone: "", address: "", note: "" });
            setOpen(false);
          }}
        >
          <input
            className="py-field"
            placeholder="نام و نام خانوادگی *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="py-field"
            placeholder="شماره تماس"
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className="py-field"
            placeholder="آدرس"
            value={form.address ?? ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <textarea
            className="py-field min-h-[72px]"
            placeholder="یادداشت"
            value={form.note ?? ""}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
          <button className="py-btn w-full" type="submit">
            {form.id ? "ذخیره تغییرات" : "ذخیره مشتری"}
          </button>
        </form>
      ) : null}

      <input
        className="py-field mb-3"
        placeholder="🔍 جستجوی مشتری (نام یا شماره)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <EmptyState text="مشتری مورد نظر پیدا نشد." />
      ) : (
        <div className="py-card divide-y divide-border">
          {filtered.map((c) => {
            const balance = c.id ? customerBalance(c.id, repairs, sales, payments) : 0;
            return (
              <div key={c.id} className="flex items-center justify-between gap-3 p-3">
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: String(c.id) }}
                  className="min-w-0 flex-1"
                >
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.phone || "بدون شماره"}</div>
                </Link>
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${balance > 0 ? "text-destructive" : "text-success"}`}>
                    {formatMoney(balance)}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-primary"
                    onClick={() => {
                      setForm({ ...c });
                      setOpen(true);
                    }}
                  >
                    ویرایش
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground"
                    onClick={() => handleDelete(c)}
                  >
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
