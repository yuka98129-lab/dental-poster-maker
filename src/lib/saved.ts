// 作ったキャンペーンを、名前をつけて、その端末に保存しておく(来月は、呼び出して直すだけ)

import { normalizeDraft, type Campaign } from "./campaign";
import { isHex } from "./color";
import { DESIGNS, LAYOUTS, TASTES, type DesignId, type LayoutId, type TasteId } from "./options";
import { parsePoster, type Poster } from "./parse";
import { DEFAULT_QR, normalizeQr, type QrSettings } from "./qr";

export const MAX_SAVED = 20;

export type SavedCampaign = {
  id: string;
  name: string;
  savedAt: number;
  campaign: Campaign;
  design: DesignId;
  layout: LayoutId;
  taste: TasteId;
  qr: QrSettings;
  brand: string;
  poster: Poster | null;
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** 端末から読んだ内容を、安全な形に整える(壊れたものは捨てる) */
export function sanitizeSaved(raw: unknown): SavedCampaign[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedCampaign[] = [];
  for (const r of raw) {
    if (!isRecord(r) || typeof r.id !== "string" || typeof r.name !== "string") continue;
    const design = [...DESIGNS.map((d) => d.id as string), "custom"].includes(r.design as string) ? (r.design as DesignId) : "navy";
    const layout = LAYOUTS.some((l) => l.id === r.layout) ? (r.layout as LayoutId) : "badge";
    out.push({
      id: r.id.slice(0, 40),
      name: r.name.slice(0, 40),
      savedAt: typeof r.savedAt === "number" ? r.savedAt : 0,
      campaign: normalizeDraft(r.campaign),
      design,
      layout,
      taste: TASTES.some((t) => t.id === r.taste) ? (r.taste as TasteId) : "clean",
      qr: r.qr ? normalizeQr(r.qr) : DEFAULT_QR,
      brand: isHex(r.brand) ? r.brand : "",
      poster: r.poster ? parsePoster(r.poster) : null,
    });
    if (out.length >= MAX_SAVED) break;
  }
  return out;
}

/** 同じ id は置き換え、新しいものを先頭にして、20件まで */
export const upsertSaved = (list: SavedCampaign[], entry: SavedCampaign): SavedCampaign[] =>
  [entry, ...list.filter((x) => x.id !== entry.id)].slice(0, MAX_SAVED);

export const removeSaved = (list: SavedCampaign[], id: string): SavedCampaign[] => list.filter((x) => x.id !== id);

/** 名前が空のときの、初めの名前(メニューの名前と、期間) */
export function defaultName(c: Campaign): string {
  const first = c.items.find((i) => i.name)?.name ?? "キャンペーン";
  return `${first}${c.period ? ` ${c.period}` : ""}`.slice(0, 40);
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
