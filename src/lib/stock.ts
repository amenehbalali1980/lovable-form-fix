import type { Product } from "./db";

export type StockLine = { productId: number | null; qty: number };

export type StockIssue = {
  productId: number;
  name: string;
  requested: number;
  available: number;
  level: "out" | "low";
  message: string;
};

/**
 * هشدار موجودی هنگام فروش یا مصرف قطعه در تعمیر.
 * `previous` قطعاتی است که قبلاً در همین سند ثبت شده بود (حالت ویرایش) و به انبار برمی‌گردد.
 */
export function checkStock(
  lines: StockLine[],
  products: Product[],
  previous: StockLine[] = [],
): StockIssue[] {
  const requested = new Map<number, number>();
  for (const line of lines) {
    if (!line.productId) continue;
    requested.set(line.productId, (requested.get(line.productId) ?? 0) + (line.qty || 0));
  }
  const returned = new Map<number, number>();
  for (const line of previous) {
    if (!line.productId) continue;
    returned.set(line.productId, (returned.get(line.productId) ?? 0) + (line.qty || 0));
  }

  const issues: StockIssue[] = [];
  for (const [productId, qty] of requested) {
    const product = products.find((p) => p.id === productId);
    if (!product) continue;
    const available = (product.qty || 0) + (returned.get(productId) ?? 0);
    const remaining = available - qty;
    if (remaining < 0) {
      issues.push({
        productId,
        name: product.name,
        requested: qty,
        available,
        level: "out",
        message: `«${product.name}» موجودی کافی ندارد (موجودی: ${available}، درخواست: ${qty})`,
      });
    } else if (remaining < (product.minQty || 0)) {
      issues.push({
        productId,
        name: product.name,
        requested: qty,
        available,
        level: "low",
        message: `«${product.name}» پس از این ثبت به ${remaining} می‌رسد (حداقل: ${product.minQty})`,
      });
    }
  }
  return issues;
}
