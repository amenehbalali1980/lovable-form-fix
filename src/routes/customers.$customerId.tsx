import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, EmptyState } from "@/components/AppShell";
import type { DeviceRec } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import {
  customerBalance,
  useCustomers,
  useDevices,
  usePayments,
  useRemoveDevice,
  useRepairs,
  useSales,
  useSave,
} from "@/lib/queries";

export const Route = createFileRoute("/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "جزئیات مشتری — PackageYar" },
      {
        name: "description",
        content: "مشاهده اطلاعات مشتری، دستگاه‌ها، سوابق تعمیرات و فاکتورها.",
      },
      { property: "og:title", content: "جزئیات مشتری — PackageYar" },
      { property: "og:description", content: "دستگاه‌ها و سوابق مشتری." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/customers/$customerId" }],
  }),
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const id = Number(customerId);
  const customers = useCustomers().data ?? [];
  const customer = customers.find((c) => c.id === id);
  const devices = useDevices().data ?? [];
  const repairs = useRepairs().data ?? [];
  const sales = useSales().data ?? [];
  const payments = usePayments().data ?? [];
  const saveDevice = useSave<DeviceRec>("devices");
  const removeDevice = useRemoveDevice();

  const [deviceOpen, setDeviceOpen] = useState(false);
  const [deviceForm, setDeviceForm] = useState<DeviceRec>({
    customerId: id,
    brand: "",
    model: "",
    type: "",
    serial: "",
    note: "",
  });

  if (!customer) {
    return (
      <AppShell title="مشتری یافت نشد" subtitle="">
        <EmptyState text="مشتری مورد نظر وجود ندارد." />
        <Link to="/customers" className="mt-4 block text-center text-sm text-primary">
          بازگشت به مشتریان
        </Link>
      </AppShell>
    );
  }

  const customerDevices = devices.filter((d) => d.customerId === id);
  const customerRepairs = repairs.filter((r) => r.customerId === id);
  const customerSales = sales.filter((s) => s.customerId === id);
  const customerPayments = payments.filter((p) => p.customerId === id);
  const balance = customerBalance(id, repairs, sales, payments);

  function handleDeleteDevice(d: DeviceRec) {
    if (!d.id) return;
    const label = [d.brand, d.model].filter(Boolean).join(" ") || "این دستگاه";
    const ok = window.confirm(
      `آیا از حذف «${label}» مطمئن هستید؟\nسوابق تعمیرات این دستگاه نیز حذف می‌شود.`,
    );
    if (!ok) return;
    removeDevice.mutate(d.id);
  }

  function openNewDeviceForm() {
    setDeviceForm({
      customerId: id,
      brand: "",
      model: "",
      type: "",
      serial: "",
      note: "",
    });
    setDeviceOpen(true);
  }

  return (
    <AppShell
      title={customer.name}
      subtitle={`${customer.phone || "بدون شماره"} · مانده: ${formatMoney(balance)}`}
      action={
        <Link to="/customers" className="py-btn py-btn-soft text-xs">
          بازگشت
        </Link>
      }
    >
      {/* اطلاعات مشتری */}
      <div className="py-card space-y-2 p-4 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">آدرس</span>
          <span className="text-left">{customer.address || "—"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">یادداشت</span>
          <span className="text-left">{customer.note || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">تعداد دستگاه‌ها</span>
          <span>{customerDevices.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">تعداد تعمیرات</span>
          <span>{customerRepairs.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">فاکتور فروش</span>
          <span>{customerSales.length}</span>
        </div>
      </div>

      {/* دستگاه‌ها */}
      <h2 className="mt-6 mb-2 text-sm font-bold">📱 دستگاه‌ها</h2>

      {deviceOpen ? (
        <form
          className="py-card mb-3 space-y-2 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!deviceForm.brand?.trim() && !deviceForm.model?.trim()) return;
            saveDevice.mutate({ ...deviceForm, customerId: id });
            setDeviceForm({
              customerId: id,
              brand: "",
              model: "",
              type: "",
              serial: "",
              note: "",
            });
            setDeviceOpen(false);
          }}
        >
          <input
            className="py-field"
            placeholder="برند"
            value={deviceForm.brand ?? ""}
            onChange={(e) => setDeviceForm({ ...deviceForm, brand: e.target.value })}
          />
          <input
            className="py-field"
            placeholder="مدل"
            value={deviceForm.model ?? ""}
            onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })}
          />
          <input
            className="py-field"
            placeholder="نوع دستگاه (مثلاً پکیج دیواری)"
            value={deviceForm.type ?? ""}
            onChange={(e) => setDeviceForm({ ...deviceForm, type: e.target.value })}
          />
          <input
            className="py-field"
            placeholder="سریال"
            value={deviceForm.serial ?? ""}
            onChange={(e) => setDeviceForm({ ...deviceForm, serial: e.target.value })}
          />
          <input
            className="py-field"
            placeholder="توضیحات"
            value={deviceForm.note ?? ""}
            onChange={(e) => setDeviceForm({ ...deviceForm, note: e.target.value })}
          />
          <div className="flex gap-2">
            <button className="py-btn flex-1" type="submit">
              {deviceForm.id ? "ذخیره تغییرات" : "ذخیره دستگاه"}
            </button>
            <button
              type="button"
              className="py-btn py-btn-soft"
              onClick={() => setDeviceOpen(false)}
            >
              انصراف
            </button>
          </div>
        </form>
      ) : (
        <button className="py-btn py-btn-soft mb-3 w-full text-xs" onClick={openNewDeviceForm}>
          + افزودن دستگاه
        </button>
      )}

      {customerDevices.length === 0 ? (
        <EmptyState text="هنوز دستگاهی ثبت نشده است." />
      ) : (
        <div className="py-card divide-y divide-border">
          {customerDevices.map((d) => (
            <div key={d.id} className="flex items-start justify-between gap-2 p-3 text-sm">
              <div className="min-w-0">
                <div className="font-semibold">
                  {[d.brand, d.model].filter(Boolean).join(" ") || "بدون نام"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {d.type ? `${d.type} · ` : ""}
                  سریال: {d.serial || "—"}
                  {d.note ? ` · ${d.note}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs">
                <button
                  type="button"
                  className="text-primary"
                  onClick={() => {
                    setDeviceForm({ ...d });
                    setDeviceOpen(true);
                  }}
                >
                  ویرایش
                </button>
                <button
                  type="button"
                  className="text-muted-foreground"
                  onClick={() => handleDeleteDevice(d)}
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* سوابق تعمیرات */}
      <h2 className="mt-6 mb-2 text-sm font-bold">🔧 سوابق تعمیرات</h2>
      {customerRepairs.length === 0 ? (
        <EmptyState text="تعمیراتی برای این مشتری ثبت نشده است." />
      ) : (
        <div className="py-card divide-y divide-border">
          {[...customerRepairs].reverse().map((r) => (
            <div key={r.id} className="p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{r.date}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.68rem]">
                  {r.status === "open"
                    ? "باز"
                    : r.status === "done"
                      ? "انجام‌شده"
                      : r.status === "delivered"
                        ? "تحویل‌شده"
                        : r.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{r.problem || "بدون توضیح"}</div>
              <div className="text-xs">{formatMoney((r.wage || 0) + (r.partsCost || 0))}</div>
            </div>
          ))}
        </div>
      )}

      {/* فاکتورهای فروش */}
      <h2 className="mt-6 mb-2 text-sm font-bold">🧾 فاکتورهای فروش</h2>
      {customerSales.length === 0 ? (
        <EmptyState text="فاکتور فروشی برای این مشتری ثبت نشده است." />
      ) : (
        <div className="py-card divide-y divide-border">
          {[...customerSales].reverse().map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <div>{s.date}</div>
                <div className="text-xs text-muted-foreground">{s.items?.length ?? 0} قلم کالا</div>
              </div>
              <div className="text-left">
                <div className="font-semibold">{formatMoney(s.total)}</div>
                <div className="text-xs text-success">دریافتی {formatMoney(s.paid)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* پرداخت‌ها */}
      <h2 className="mt-6 mb-2 text-sm font-bold">📥 پرداخت‌ها</h2>
      {customerPayments.length === 0 ? (
        <EmptyState text="پرداختی برای این مشتری ثبت نشده است." />
      ) : (
        <div className="py-card divide-y divide-border">
          {[...customerPayments].reverse().map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                {p.date}
                {p.method ? ` · ${p.method}` : ""}
              </div>
              <span className="text-success">{formatMoney(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
