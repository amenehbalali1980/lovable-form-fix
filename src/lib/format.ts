export function toEnglishDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  for (let i = 0; i < 10; i++) {
    text = text.split(fa[i]!).join(String(i)).split(ar[i]!).join(String(i));
  }
  return text;
}

export function parseNumber(value: string | number | null | undefined): number {
  const text = toEnglishDigits(value)
    .replace(/[,٬\s]/g, "")
    .trim();
  if (!text) return 0;
  const n = Number(text);
  return Number.isNaN(n) ? 0 : n;
}

export function formatNumber(value: number): string {
  return (Number(value) || 0).toLocaleString("fa-IR");
}

export function formatMoney(value: number): string {
  return `${formatNumber(value)} تومان`;
}

function gregorianToJalali(gy: number, gm: number, gd: number) {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    (gdm[gm - 1] ?? 0);
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { year: jy, month: jm, day: jd };
}

export function todayJalali(date = new Date()): string {
  const j = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return `${j.year}/${String(j.month).padStart(2, "0")}/${String(j.day).padStart(2, "0")}`;
}
const WEEKDAYS_FA = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
] as const;

/** مثلاً: شنبه ۱۴۰۵/۰۶/۰۹ */
export function todayJalaliWithWeekday(date = new Date()): string {
  const weekday = WEEKDAYS_FA[date.getDay()] ?? "";
  return `${weekday} ${todayJalali(date)}`;
}