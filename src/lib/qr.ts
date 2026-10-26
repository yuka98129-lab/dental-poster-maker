// QRコード。予約ページなどのURLから、ポスターに置く図を作る(端末の中だけで作る。URLは、どこにも送らない)
import qrcode from "qrcode-generator";

export const QR_LIMITS = { url: 300, label: 8 } as const;
export const QR_LONG_URL = 80; // これより長いと、小さく印刷したときに、読み取りにくくなる

export type QrSettings = { on: boolean; url: string; label: string };
export const DEFAULT_QR: QrSettings = { on: false, url: "", label: "ご予約はこちら" };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** 端末から読んだ内容を整える */
export function normalizeQr(raw: unknown): QrSettings {
  const r = isRecord(raw) ? raw : {};
  return {
    on: r.on === true,
    url: typeof r.url === "string" ? r.url.trim().slice(0, QR_LIMITS.url) : "",
    label: typeof r.label === "string" ? r.label.replace(/[<>\r\n]/g, " ").trim().slice(0, QR_LIMITS.label) : DEFAULT_QR.label,
  };
}

/** http / https のURLだけ使う(javascript: などは、使わない)。使えるときは、整えたURLを返す */
export function cleanUrl(input: string): string | null {
  try {
    const u = new URL(input.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

export type QrShape = { size: number; d: string };

/** 図の形。size は、まわりの余白(4マス)を入れた、1辺のマス数。d は、黒いマスを、まとめて描く道すじ */
export function qrShape(url: string): QrShape | null {
  const clean = cleanUrl(url);
  if (!clean) return null;
  try {
    const qr = qrcode(0, "M");
    qr.addData(clean);
    qr.make();
    const n = qr.getModuleCount();
    const quiet = 4;
    let d = "";
    for (let r = 0; r < n; r++) {
      let c = 0;
      while (c < n) {
        if (!qr.isDark(r, c)) {
          c++;
          continue;
        }
        let end = c;
        while (end < n && qr.isDark(r, end)) end++;
        d += `M${c + quiet} ${r + quiet}h${end - c}v1h${-(end - c)}z`;
        c = end;
      }
    }
    return { size: n + quiet * 2, d };
  } catch {
    return null; // 長すぎて、QRコードにできない
  }
}
