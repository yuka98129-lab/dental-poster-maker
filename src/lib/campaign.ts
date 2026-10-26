// キャンペーン(料金・期間)の入力。金額・期間・条件は、人が入れた文字・数字だけを使う(AIには作らせない)。
// 画面の入力途中の形(normalizeDraft)と、サーバーに送る・ポスターに出す形(parseCampaign)を、分けている。

export const MAX_ITEMS = 3;
export const CAMPAIGN_LIMITS = { name: 24, price: 7, period: 24, condition: 24 } as const;

export type CampaignItem = { name: string; regular: string; sale: string };
export type Campaign = { items: CampaignItem[]; period: string; condition: string };

export const NO_CAMPAIGN: Campaign = { items: [], period: "", condition: "" };
export const EMPTY_ITEM: CampaignItem = { name: "", regular: "", sale: "" };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** 文字を整える。AIへの指示の枠を壊す < > と、改行は、空白にする */
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[<>\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

/** 金額は、数字だけにする(全角の数字、「15,000円」のような書き方も読める)。7けたまで */
export function digits(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.normalize("NFKC").replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, CAMPAIGN_LIMITS.price);
}

/** 入力の途中でも壊れない形に整える(名前だけ、金額だけの行も残す)。メニューの行は、1〜3行 */
export function normalizeDraft(raw: unknown): Campaign {
  const r = isRecord(raw) ? raw : {};
  const items = (Array.isArray(r.items) ? r.items : [])
    .map((x) => (isRecord(x) ? { name: clean(x.name, CAMPAIGN_LIMITS.name), regular: digits(x.regular), sale: digits(x.sale) } : null))
    .filter((x): x is CampaignItem => x !== null)
    .slice(0, MAX_ITEMS);
  return {
    items: items.length ? items : [{ ...EMPTY_ITEM }],
    period: clean(r.period, CAMPAIGN_LIMITS.period),
    condition: clean(r.condition, CAMPAIGN_LIMITS.condition),
  };
}

/** ポスターや文章に使える行(メニューの名前と、キャンペーンの金額が、そろっているもの) */
export const validItems = (c: Campaign) => c.items.filter((i) => i.name !== "" && i.sale !== "");

/** サーバーに送る・ポスターに出す形。そろっていない行は、取り除く */
export function parseCampaign(raw: unknown): Campaign {
  const d = normalizeDraft(raw);
  return { ...d, items: validItems(d) };
}

export const formatYen = (d: string) => (d === "" ? "" : `${Number(d).toLocaleString("en-US")}円`);

/** 通常の金額が、キャンペーンの金額より高くないとき、入力の見直しをすすめる */
export const priceWarning = (i: CampaignItem) =>
  i.regular !== "" && i.sale !== "" && Number(i.regular) <= Number(i.sale)
    ? "通常の金額が、キャンペーンの金額より高くなっていません。入れ間違いがないか、見てください。"
    : "";
