import { useMemo, useState } from "react";
import type { Product } from "@/lib/db";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { toast } from "sonner";

type Props = {
  products: Product[];
  onPick: (productId: number) => void;
  placeholder?: string;
  showStock?: boolean;
};

export function ProductPicker({
  products,
  onPick,
  placeholder = "+ افزودن کالا…",
  showStock = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code ?? "").toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [products, query]);

  const handleScan = (code: string) => {
    setScanning(false);
    const found = products.find(
      (p) => (p.code ?? "").toLowerCase() === code.toLowerCase().trim(),
    );
    if (found?.id != null) {
      onPick(found.id);
      toast.success(`اضافه شد: ${found.name}`);
    } else {
      toast.error(`کالایی با کد «${code}» پیدا نشد`);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          className="py-field flex-1"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150);
          }}
        />
        <button
          type="button"
          className="py-btn py-btn-soft shrink-0 px-3"
          title="اسکن بارکد / QR"
          onClick={() => setScanning(true)}
        >
          📷
        </button>
      </div>

      {open ? (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-card shadow-md">
          {filtered.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground">کالایی پیدا نشد</div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (p.id == null) return;
                  onPick(p.id);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span>
                  {p.name}
                  {p.code ? (
                    <span className="mr-2 text-[11px] text-muted-foreground" dir="ltr">
                      {p.code}
                    </span>
                  ) : null}
                </span>
                {showStock ? (
                  <span className="text-xs text-muted-foreground">موجودی: {p.qty}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}

      {scanning ? (
        <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />
      ) : null}
    </div>
  );
}