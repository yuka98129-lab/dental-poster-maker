import { NO_CAMPAIGN, parseCampaign, validItems, type Campaign } from "./campaign";
import { AUDIENCES, KINDS, LIMITS, MODES, THEMES, TONES, themesFor, type AudienceId, type KindId, type ModeId, type ThemeId, type ToneId } from "./options";

export type GenerateRequest = {
  mode: ModeId;
  kind: KindId;
  theme: ThemeId;
  topic: string;
  audience: AudienceId;
  tone: ToneId;
  memo: string;
  voice: string;
  campaign: Campaign;
  /** ポスターから、SNSの文章をつくるとき、そのポスターの文章(同じ内容でそろえるため) */
  basedOn: string;
};

type Parsed = { ok: true; value: GenerateRequest } | { ok: false; message: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const pick = <T extends { id: string }>(list: readonly T[], v: unknown): T["id"] | null =>
  typeof v === "string" && list.some((x) => x.id === v) ? v : null;

/** 受け取った内容を、決まった選択肢と、長さの上限に整える。選択肢にない値は断る */
export function parseGenerateRequest(body: unknown): Parsed {
  if (!isRecord(body)) return { ok: false, message: "リクエストの形式が正しくありません。" };
  const mode = pick(MODES, body.mode) as ModeId | null;
  const kind = pick(KINDS, body.kind) as KindId | null;
  const audience = pick(AUDIENCES, body.audience) as AudienceId | null;
  const tone = pick(TONES, body.tone) as ToneId | null;
  const theme = pick(THEMES, body.theme);
  if (!mode || !kind || !audience || !tone || !theme) return { ok: false, message: "選んだ内容が正しくありません。もう一度選んでください。" };
  if (!themesFor(mode).some((t) => t.id === theme)) return { ok: false, message: "このテーマは、いまの選択では使えません。" };
  if (mode === "self" && kind === "poster") return { ok: false, message: "ポスターは、医院の投稿で使えます。" };
  const topic = text(body.topic, LIMITS.topic);
  if (theme === "free" && !topic) return { ok: false, message: "「自由に書く」のときは、テーマの内容を書いてください。" };
  // キャンペーンの内容は、「キャンペーン」のテーマのときだけ使う。メニューと金額が、1つはそろっている必要がある
  const campaign = theme === "campaign" ? parseCampaign(body.campaign) : NO_CAMPAIGN;
  if (theme === "campaign" && validItems(campaign).length === 0) return { ok: false, message: "メニューの名前と、キャンペーンの金額を、1つ以上入れてください。" };
  return {
    ok: true,
    value: { mode, kind, theme, topic, audience, tone, memo: text(body.memo, LIMITS.memo), voice: text(body.voice, LIMITS.voice), campaign, basedOn: kind === "sns" ? text(body.basedOn, LIMITS.basedOn) : "" },
  };
}
