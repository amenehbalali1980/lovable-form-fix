import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addRecord,
  deleteRecord,
  getAll,
  putRecord,
  type Customer,
  type CustomerPayment,
  type DeviceRec,
  type Product,
  type PurchaseInvoice,
  type Repair,
  type SalesInvoice,
  type StockTransaction,
  type StoreName,
} from "./db";
import { markNeedsBackup } from "./backup-flag";

export function useRows<T>(store: StoreName) {
  return useQuery({
    queryKey: [store],
    queryFn: () => getAll<T>(store),
    staleTime: 0,
  });
}

export function useSave<T extends { id?: number }>(store: StoreName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (value: T) => {
      const payload = {
        ...value,
        createdAt: (value as { createdAt?: string }).createdAt ?? new Date().toISOString(),
      };
      if (value.id) return putRecord(store, payload);
      const { id: _omit, ...rest } = payload as Record<string, unknown> & { id?: number };
      return addRecord(store, rest);
    },
    onSuccess: () => {
      markNeedsBackup();
      qc.invalidateQueries();
    },
  });
}

export function useRemove(store: StoreName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteRecord(store, id),
    onSuccess: () => {
      markNeedsBackup();
      qc.invalidateQueries();
    },
  });
}

/** حذف مشتری همراه با دستگاه‌ها و تعمیرات مرتبط */
export function useRemoveCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customerId: number) => {
      const devices = await getAll<DeviceRec>("devices");
      const repairs = await getAll<Repair>("repairs");

      for (const d of devices) {
        if (Number(d.customerId) === Number(customerId) && d.id != null) {
          await deleteRecord("devices", d.id);
        }
      }
      for (const r of repairs) {
        if (Number(r.customerId) === Number(customerId) && r.id != null) {
          await deleteRecord("repairs", r.id);
        }
      }
      await deleteRecord("customers", customerId);
    },
    onSuccess: () => {
      markNeedsBackup();
      qc.invalidateQueries();
    },
  });
}

/** حذف دستگاه همراه با تعمیرات مرتبط */
export function useRemoveDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deviceId: number) => {
      const repairs = await getAll<Repair>("repairs");
      for (const r of repairs) {
        if (Number(r.deviceId) === Number(deviceId) && r.id != null) {
          await deleteRecord("repairs", r.id);
        }
      }
      await deleteRecord("devices", deviceId);
    },
    onSuccess: () => {
      markNeedsBackup();
      qc.invalidateQueries({ queryKey: ["devices"] });
      qc.invalidateQueries({ queryKey: ["repairs"] });
      qc.invalidateQueries();
    },
  });
}

export function useCustomers() {
  return useRows<Customer>("customers");
}
export function useDevices() {
  return useRows<DeviceRec>("devices");
}
export function useProducts() {
  return useRows<Product>("products");
}
export function useRepairs() {
  return useRows<Repair>("repairs");
}
export function useSales() {
  return useRows<SalesInvoice>("salesInvoices");
}
export function usePurchases() {
  return useRows<PurchaseInvoice>("purchaseInvoices");
}
export function usePayments() {
  return useRows<CustomerPayment>("customerPayments");
}
export function useStockTransactions() {
  return useRows<StockTransaction>("stockTransactions");
}

export function customerBalance(
  customerId: number,
  repairs: Repair[],
  sales: SalesInvoice[],
  payments: CustomerPayment[],
): number {
  const repairDebt = repairs
    .filter((r) => r.customerId === customerId)
    .reduce((sum, r) => sum + (r.wage || 0) + (r.partsCost || 0), 0);
  const salesDebt = sales
    .filter((s) => s.customerId === customerId)
    .reduce((sum, s) => sum + (s.total || 0) - (s.paid || 0), 0);
  const paid = payments
    .filter((p) => p.customerId === customerId)
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  return repairDebt + salesDebt - paid;
}

/** Apply +/- quantity changes to products in IndexedDB. */
export async function applyStockDeltas(deltas: { productId?: number | null; qty: number }[]) {
  if (deltas.length === 0) return;
  const products = await getAll<Product>("products");
  const map = new Map<number, Product>();
  for (const d of deltas) {
    if (!d.productId) continue;
    const current = map.get(d.productId) ?? products.find((p) => p.id === d.productId);
    if (!current) continue;
    map.set(d.productId, { ...current, qty: Math.max(0, (current.qty || 0) + d.qty) });
  }
  for (const product of map.values()) {
    await putRecord("products", product);
  }
}

export function useStockDeltas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deltas: { productId?: number | null; qty: number }[]) => applyStockDeltas(deltas),
    onSuccess: () => {
      markNeedsBackup();
      qc.invalidateQueries();
    },
  });
}

export function productStock(productId: number, transactions: StockTransaction[]): number {
  return transactions
    .filter((t) => t.productId === productId)
    .reduce((sum, t) => sum + (t.type === "in" ? t.qty : -t.qty), 0);
}