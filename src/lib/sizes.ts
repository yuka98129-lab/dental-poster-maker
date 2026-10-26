// 画像の大きさ(A4・SNS用)と、文字の大きさの選択肢。

export const SIZES = [
  { id: "a4", label: "A4ポスター", sub: "印刷・院内に貼る" },
  { id: "sq", label: "正方形", sub: "Instagram投稿 1080×1080" },
  { id: "story", label: "ストーリーズ", sub: "縦長 1080×1920" },
] as const;
export type SizeId = (typeof SIZES)[number]["id"];

/** PNGにするときの、横のピクセル数(A4は、印刷向けに、少し大きめ) */
export const PNG_WIDTH: Record<SizeId, number> = { a4: 1240, sq: 1080, story: 1080 };

export const TEXT_SIZES = [
  { id: "s", label: "小さめ", scale: 0.92 },
  { id: "m", label: "ふつう", scale: 1 },
  { id: "l", label: "大きめ", scale: 1.08 },
] as const;
export type TextSizeId = (typeof TEXT_SIZES)[number]["id"];
export const textScale = (id: TextSizeId) => TEXT_SIZES.find((t) => t.id === id)?.scale ?? 1;
