import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type Props = {
  onScan: (code: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const regionId = "py-qr-reader";
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            if (startedRef.current) {
              startedRef.current = false;
              onScan(decoded);
              void scanner.stop().catch(() => {});
            }
          },
          () => {},
        );
        startedRef.current = true;
      } catch (e) {
        setError("دسترسی به دوربین ممکن نیست. اجازه دوربین را بررسی کنید.");
      }
    };

    void start();

    return () => {
      startedRef.current = false;
      if (scannerRef.current?.isScanning) {
        void scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm font-bold">اسکن بارکد / QR</span>
        <button
          className="rounded-md bg-white/20 px-3 py-1 text-sm"
          onClick={onClose}
        >
          بستن
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div
          id="py-qr-reader"
          className="w-full max-w-sm overflow-hidden rounded-xl"
        />
      </div>

      {error ? (
        <p className="p-4 text-center text-sm text-red-300">{error}</p>
      ) : (
        <p className="p-4 text-center text-xs text-white/70">
          QR یا بارکد کالا را داخل کادر بگیرید
        </p>
      )}
    </div>
  );
}