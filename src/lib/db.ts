// IndexedDB layer for PackageYar — same database name/stores as the original app.
export const DB_NAME = "PackageYarDB";
export const DB_VERSION = 6;

export type StoreName =
  | "customers"
  | "devices"
  | "repairs"
  | "products"
  | "stockTransactions"
  | "purchaseInvoices"
  | "salesInvoices"
  | "invoiceItems"
  | "settings"
  | "customerPayments";

export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  address?: string;
  note?: string;
  createdAt?: string;
}

export interface DeviceRec {
  id?: number;
  customerId: number;
  brand?: string;
  model?: string;
  type?: string;
  serial?: string;
  note?: string;
  createdAt?: string;
}

export interface RepairUsedPart {
  productId: number;
  name: string;
  qty: number;
  price: number;
}

export interface Repair {
  id?: number;
  customerId: number;
  deviceId?: number | null;
  date: string;
  problem?: string;
  action?: string;
  wage: number;
  partsCost: number;
  usedParts?: RepairUsedPart[];
  status: "open" | "done" | "delivered";
  createdAt?: string;
}

export interface Product {
  id?: number;
  name: string;
  code?: string;
  unit?: string;
  qty: number;
  minQty: number;
  buyPrice: number;
  sellPrice: number;
  createdAt?: string;
}

export interface StockTransaction {
  id?: number;
  productId: number;
  type: "in" | "out";
  qty: number;
  date: string;
  note?: string;
  createdAt?: string;
}

export interface SalesInvoiceItem {
  productId: number | null;
  name: string;
  qty: number;
  price: number;
}

export interface SalesInvoice {
  id?: number;
  customerId: number | null;
  date: string;
  items: SalesInvoiceItem[];
  total: number;
  paid: number;
  note?: string;
  createdAt?: string;
}

export interface PurchaseInvoiceItem {
  productId: number | null;
  name: string;
  qty: number;
  price: number;
}

export interface PurchaseInvoice {
  id?: number;
  supplier?: string;
  date: string;
  items: PurchaseInvoiceItem[];
  total: number;
  paid: number;
  note?: string;
  createdAt?: string;
}

export interface CustomerPayment {
  id?: number;
  customerId: number;
  amount: number;
  date: string;
  method?: string;
  note?: string;
  relatedType?: string;
  relatedId?: number | null;
  createdAt?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function upgrade(database: IDBDatabase) {
  const ensure = (name: StoreName, options: IDBObjectStoreParameters, indexes: string[] = []) => {
    if (database.objectStoreNames.contains(name)) return;
    const store = database.createObjectStore(name, options);
    indexes.forEach((index) => store.createIndex(index, index, { unique: false }));
  };

  const auto = { keyPath: "id", autoIncrement: true };
  ensure("customers", auto, ["name", "phone"]);
  ensure("devices", auto, ["customerId"]);
  ensure("repairs", auto, ["customerId", "deviceId", "date"]);
  ensure("products", auto, ["name"]);
  ensure("stockTransactions", auto, ["productId", "type", "date"]);
  ensure("purchaseInvoices", auto, ["date"]);
  ensure("salesInvoices", auto, ["date", "customerId"]);
  ensure("invoiceItems", auto, ["invoiceId"]);
  ensure("settings", { keyPath: "key" });
  ensure("customerPayments", auto, ["customerId", "date", "relatedType", "relatedId"]);
}

export function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => upgrade((event.target as IDBOpenDBRequest).result);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

async function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(store, mode);
    const request = run(transaction.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const getAll = <T>(store: StoreName) =>
  tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
export const getOne = <T>(store: StoreName, id: IDBValidKey) =>
  tx<T>(store, "readonly", (s) => s.get(id) as IDBRequest<T>);
export const putRecord = <T>(store: StoreName, value: T) =>
  tx<IDBValidKey>(store, "readwrite", (s) => s.put(value as unknown as Record<string, unknown>));
export const addRecord = <T>(store: StoreName, value: T) =>
  tx<IDBValidKey>(store, "readwrite", (s) => s.add(value as unknown as Record<string, unknown>));
export const deleteRecord = (store: StoreName, id: IDBValidKey) =>
  tx<undefined>(store, "readwrite", (s) => s.delete(id) as IDBRequest<undefined>);

export const ALL_STORES: StoreName[] = [
  "customers",
  "devices",
  "repairs",
  "products",
  "stockTransactions",
  "purchaseInvoices",
  "salesInvoices",
  "invoiceItems",
  "settings",
  "customerPayments",
];

export async function exportAll(): Promise<Record<string, unknown[]>> {
  const result: Record<string, unknown[]> = {};
  for (const store of ALL_STORES) {
    result[store] = await getAll(store);
  }
  return result;
}

export async function importAll(data: Record<string, unknown[]>) {
  for (const store of ALL_STORES) {
    const rows = data[store];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      await putRecord(store, row);
    }
  }
}
