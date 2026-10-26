// ポスターを、PNG画像にして保存する(画面で見えているものを、そのまま画像にする。サーバーは使わない)
import { toBlob } from "html-to-image";

/** targetWidth: 横のピクセル数(A4は1240 ≒ 150dpi、SNS用は1080) */
export async function posterToPng(node: HTMLElement, targetWidth = 1240): Promise<Blob> {
  const pixelRatio = Math.min(4, targetWidth / Math.max(1, node.clientWidth));
  const options = { pixelRatio, backgroundColor: "#ffffff", style: { borderRadius: "0" } };
  // iPhone の Safari は、1回目が空白になることがあるので、1回目は、ならしに使う
  await toBlob(node, options).catch(() => null);
  const blob = await toBlob(node, options);
  if (!blob) throw new Error("画像にできませんでした");
  return blob;
}

/** スマホでは、共有画面を開く(写真アプリやLINEに、すぐ送れる)。パソコンでは、ダウンロード */
export async function savePng(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });
  const touch = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  if (touch && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // 自分でやめた
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
