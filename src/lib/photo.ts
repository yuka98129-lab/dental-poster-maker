// ポスターに使う写真。端末の中だけで小さくして使う(どこにも送らない)。
// 写り込んだ位置情報などは、描き直すときに、消える。

export const PHOTO_MAX_EDGE = 1400;
export const PHOTO_MAX_BYTES = 20 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** 長いほうの辺が max になるように、縮める(小さい写真は、そのまま) */
export function fitSize(w: number, h: number, max = PHOTO_MAX_EDGE): { w: number; h: number } {
  const edge = Math.max(w, h);
  if (edge <= max || edge <= 0) return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
  const r = max / edge;
  return { w: Math.max(1, Math.round(w * r)), h: Math.max(1, Math.round(h * r)) };
}

/** 写真ファイルを、縮めたJPEG(data URL)にする。使えない形式・大きすぎるときは、理由つきで失敗 */
export async function readPhoto(file: File): Promise<string> {
  if (!PHOTO_TYPES.includes(file.type)) throw new Error("JPEG・PNG・WebPの写真を選んでください。");
  if (file.size > PHOTO_MAX_BYTES) throw new Error("写真が大きすぎます(20MBまで)。");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode().catch(() => {
      throw new Error("写真を開けませんでした。ほかの写真で試してください。");
    });
    const { w, h } = fitSize(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("写真を読み込めませんでした。");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}
