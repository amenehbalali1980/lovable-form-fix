import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOne, putRecord } from "./db";

export type ShopProfile = {
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  cardNumber: string;
  footerNote: string;
  logo: string;
  headerBanner: string;
  stamp: string;
};

export const emptyShopProfile: ShopProfile = {
  shopName: "PackageYar",
  ownerName: "",
  phone: "",
  address: "",
  cardNumber: "",
  footerNote: "",
  logo: "",
  headerBanner: "",
  stamp: "",
};

const KEY = "shopProfile";

export async function loadShopProfile(): Promise<ShopProfile> {
  const row = await getOne<{ key: string; value: Partial<ShopProfile> }>("settings", KEY);
  return { ...emptyShopProfile, ...(row?.value ?? {}) };
}

export function useShopProfile() {
  return useQuery({ queryKey: ["settings", KEY], queryFn: loadShopProfile, staleTime: 0 });
}

export function useSaveShopProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: ShopProfile) => putRecord("settings", { key: KEY, value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", KEY] }),
  });
}

// ============================================================
// PIN / قفل محلی
// ============================================================

const PIN_KEY = "pinHash";

/** هش کردن PIN با SHA-256 */
async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** آیا PIN تنظیم شده؟ */
export async function hasPin(): Promise<boolean> {
  const row = await getOne<{ key: string; value: string }>("settings", PIN_KEY);
  return Boolean(row?.value);
}

/** ذخیره PIN جدید */
export async function setPin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  await putRecord("settings", { key: PIN_KEY, value: hash });
}

/** حذف PIN */
export async function clearPin(): Promise<void> {
  await putRecord("settings", { key: PIN_KEY, value: "" });
}

/** بررسی صحت PIN وارد شده */
export async function verifyPin(pin: string): Promise<boolean> {
  const row = await getOne<{ key: string; value: string }>("settings", PIN_KEY);
  if (!row?.value) return true; // اگر PIN وجود نداشت، همیشه درست است
  const hash = await hashPin(pin);
  return hash === row.value;
}