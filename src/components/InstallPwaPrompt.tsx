import { useEffect, useState } from "react";
import { Share, SquarePlus, Download, X, MonitorDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

type Platform = "android" | "ios" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_DAYS = 7;

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIos) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function wasRecentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const at = Number(raw);
  if (Number.isNaN(at)) return false;
  return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function InstallPwaPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("android");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInstalled() || wasRecentlyDismissed()) return;

    setPlatform(detectPlatform());
    // Show the banner shortly after load so it does not flash during hydration.
    const timer = window.setTimeout(() => setVisible(true), 1500);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4" dir="rtl">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">نصب نسخهٔ اپلیکیشن (PWA)</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              برای دسترسی سریع و کار آفلاین، پکیج‌یار را روی همین دستگاه نصب کنید:
            </p>

            {platform === "ios" ? (
              <ol className="mt-2 space-y-1.5 text-xs leading-6 text-foreground">
                <li className="flex items-center gap-1.5">
                  <span className="font-medium text-primary">۱.</span>
                  در سافاری روی دکمهٔ
                  <Share className="inline h-4 w-4 text-primary" />
                  «اشتراک‌گذاری» بزنید.
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="font-medium text-primary">۲.</span>
                  گزینهٔ
                  <SquarePlus className="inline h-4 w-4 text-primary" />
                  «افزودن به صفحهٔ اصلی» (Add to Home Screen) را انتخاب کنید.
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="font-medium text-primary">۳.</span>
                  روی «افزودن» (Add) بزنید تا آیکن روی صفحهٔ اصلی قرار گیرد.
                </li>
              </ol>
            ) : deferredPrompt ? (
              <Button onClick={install} size="sm" className="mt-3 w-full sm:w-auto">
                <Download className="h-4 w-4" />
                نصب اپلیکیشن
              </Button>
            ) : platform === "android" ? (
              <ol className="mt-2 space-y-1.5 text-xs leading-6 text-foreground">
                <li className="flex items-center gap-1.5">
                  <span className="font-medium text-primary">۱.</span>
                  منوی سه‌نقطهٔ
                  <Menu className="inline h-4 w-4 text-primary" />
                  مرورگر (کروم) را باز کنید.
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="font-medium text-primary">۲.</span>
                  گزینهٔ «نصب برنامه» یا «افزودن به صفحهٔ اصلی» را انتخاب کنید.
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="font-medium text-primary">۳.</span>
                  «نصب» را تأیید کنید تا آیکن روی صفحهٔ اصلی قرار گیرد.
                </li>
              </ol>
            ) : (
              <ol className="mt-2 space-y-1.5 text-xs leading-6 text-foreground">
                <li className="flex items-center gap-1.5">
                  <span className="font-medium text-primary">۱.</span>
                  در نوار آدرس مرورگر روی آیکن نصب
                  <MonitorDown className="inline h-4 w-4 text-primary" />
                  کلیک کنید.
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="font-medium text-primary">۲.</span>
                  «نصب» را تأیید کنید تا برنامه مثل یک اپ مستقل باز شود.
                </li>
              </ol>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="بستن"
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
