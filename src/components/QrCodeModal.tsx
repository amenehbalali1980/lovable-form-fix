import { QRCodeSVG } from "qrcode.react";

type Props = {
  code: string;
  name: string;
  onClose: () => void;
};

export function QrCodeModal({ code, name, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs space-y-4 rounded-xl bg-card p-6 text-center shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold">{name}</h3>
        <p className="text-xs text-muted-foreground" dir="ltr">
          {code}
        </p>

        <div className="flex justify-center rounded-lg bg-white p-4">
          <QRCodeSVG value={code} size={180} level="M" includeMargin />
        </div>

        <p className="text-[11px] text-muted-foreground">
          این QR را چاپ کن یا روی کالا بچسبان
        </p>

        <button className="py-btn w-full" onClick={onClose}>
          بستن
        </button>
      </div>
    </div>
  );
}