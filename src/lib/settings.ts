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
