// 医院の「ブランドカラー」1色から、ポスターの配色(帯・やわらかい面・飾り)を作る。
// 帯の上の白い文字が読めるように、色が明るいときは、読める濃さまで暗くする。

export const DEFAULT_BRAND = "#1e3f7a";

type RGB = [number, number, number];

export const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

const toRgb = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => v + (b[i] - v) * t) as RGB;

const lin = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (c: RGB) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);

/** 白い文字を、その色の上に置いたときの、見やすさ(4.5以上が、読みやすい目安) */
export const contrastWithWhite = (hex: string) => 1.05 / (luminance(toRgb(hex)) + 0.05);

export function brandVars(hex: string): Record<string, string> {
  let pd = toRgb(isHex(hex) ? hex : DEFAULT_BRAND);
  for (let i = 0; i < 30 && 1.05 / (luminance(pd) + 0.05) < 4.5; i++) pd = mix(pd, [0, 0, 0], 0.1);
  const white: RGB = [255, 255, 255];
  return {
    "--pd": toHex(pd),
    "--pm": toHex(mix(pd, white, 0.12)),
    "--pbg": toHex(mix(pd, white, 0.9)),
    "--pl": toHex(mix(pd, white, 0.78)),
    "--pg": toHex(mix(pd, white, 0.96)),
    "--pa": toHex(mix(pd, white, 0.4)),
  };
}
