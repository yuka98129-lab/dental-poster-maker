// 画面とサーバーで共通の選択肢。サーバーは、受け取った id がここにあるものだけを使う(自由な文字を指示に混ぜない)。

export const MODES = [
  { id: "clinic", label: "医院の投稿" },
  { id: "self", label: "自分の発信" },
] as const;
export type ModeId = (typeof MODES)[number]["id"];

export const KINDS = [
  { id: "poster", label: "院内ポスター", sub: "待合室・受付に貼る A4" },
  { id: "sns", label: "SNSの投稿文", sub: "Instagram・X・LINE・ブログ" },
  { id: "script", label: "動画の台本", sub: "TikTok・リール(15〜30秒)" },
] as const;
export type KindId = (typeof KINDS)[number]["id"];

type Theme = { id: string; label: string; note: string; modes: readonly ModeId[]; needsMemo?: string };

export const THEMES: readonly Theme[] = [
  { id: "recall", label: "定期検診のおすすめ", note: "定期的な検診とクリーニングを受けることを、すすめる", modes: ["clinic"] },
  { id: "kids", label: "子どもの仕上げみがき", note: "保護者向けに、子どもの仕上げみがきの大切さとコツを伝える", modes: ["clinic", "self"] },
  { id: "close", label: "休診のお知らせ", note: "休診の期間と、診療を再開する日を知らせる。日付は memo に書かれているものだけを使う", modes: ["clinic"], needsMemo: "休診の日付を、ここに書いてください(例: 12月29日〜1月3日、1月4日から診療)" },
  { id: "fluor", label: "フッ素のおはなし", note: "フッ素の、一般的なはたらきと使い方のポイントを、やさしく伝える", modes: ["clinic", "self"] },
  { id: "work", label: "現場で役立つ仕事のコツ", note: "新人の歯科衛生士に向けて、現場で役立つ仕事のコツを、先輩の目線でやさしく伝える", modes: ["self"] },
  { id: "pitfall", label: "つまずきやすいポイント", note: "新人の歯科衛生士がつまずきやすいポイントと、その対策を、先輩の目線で伝える", modes: ["self"] },
  { id: "ask", label: "先輩への相談・報連相", note: "新人の歯科衛生士に向けて、先輩や院長への相談・報告・質問のしかたのコツを伝える", modes: ["self"] },
  { id: "talk", label: "患者さんへの声かけ", note: "新人の歯科衛生士に向けて、患者さんへの声かけの考え方と、言い方の例を伝える(特定の患者さんの話は書かない)", modes: ["self"] },
  { id: "study", label: "勉強・就職のヒント", note: "歯科衛生士をめざす学生や新人に向けて、勉強や就職活動、仕事を続けるためのヒントを伝える", modes: ["self"] },
  { id: "free", label: "自由に書く", note: "topic に書かれた内容", modes: ["clinic", "self"] },
];
export type ThemeId = string;

export const AUDIENCES = [
  { id: "all", label: "みなさん", note: "地域や、フォロワーのみなさん" },
  { id: "parent", label: "保護者", note: "子どもを育てている保護者" },
  { id: "senior", label: "高齢の方", note: "高齢の方と、その家族" },
  { id: "junior", label: "新人歯科衛生士・学生", note: "働き始めたばかりの歯科衛生士や、歯科衛生士をめざす学生" },
] as const;
export type AudienceId = (typeof AUDIENCES)[number]["id"];

export const TONES = [
  { id: "soft", label: "やさしい", note: "やわらかく、安心感のある" },
  { id: "pop", label: "元気", note: "明るく、親しみやすい" },
  { id: "calm", label: "まじめ", note: "落ち着いた、丁寧な" },
] as const;
export type ToneId = (typeof TONES)[number]["id"];

export const DESIGNS = [
  { id: "mint", label: "ミント", from: "#e6f8f5", to: "#1fb5a3" },
  { id: "sakura", label: "さくら", from: "#fdeaf1", to: "#e7709b" },
  { id: "sora", label: "そら", from: "#e6f1fd", to: "#4a95e0" },
  { id: "sun", label: "たいよう", from: "#fff4d1", to: "#f2a900" },
  { id: "kirakira", label: "キラキラ", from: "#e6f8f5", to: "#1fb5a3" },
] as const;
export type DesignId = (typeof DESIGNS)[number]["id"];

export const LIMITS = { memo: 300, topic: 100, voice: 100 } as const;

/** そのモードで使えるテーマ。そのモード専用のものを先に並べる(自分の発信なら、新人さん向けのテーマが先頭) */
export const themesFor = (mode: ModeId) =>
  THEMES.filter((t) => t.modes.includes(mode)).sort((a, b) => (a.modes.length === 1 ? 0 : 1) - (b.modes.length === 1 ? 0 : 1));
