// 季節・イベントのテンプレート。選ぶと、テーマと内容のたたき台が入る。
// 日付・金額は、テンプレートに入れない(人が入れる)。入れるのは、日付に関わらない言い方だけ。

import type { ThemeId } from "./options";

export type Template = {
  id: string;
  group: "season" | "close" | "campaign";
  label: string;
  theme: ThemeId;
  /** theme が "free" のときの、テーマの内容 */
  topic?: string;
  /** campaign のとき、メニューの名前のたたき台(金額・期間は、人が入れる) */
  menus?: string[];
  /** 画面に出す、次にすることのお知らせ */
  next: string;
};

export const TEMPLATE_GROUPS = [
  { id: "season", label: "季節・記念日" },
  { id: "close", label: "休診のお知らせ" },
  { id: "campaign", label: "キャンペーン" },
] as const;

const DATE_NEXT = "「ひとこと足す」に、休診の日付と、診療を再開する日を入れてから、「AIでつくる」を押してください。";

export const TEMPLATES: readonly Template[] = [
  { id: "spring", group: "season", label: "春・新年度の検診", theme: "free", topic: "新年度のはじまりに、お口の定期検診をおすすめする", next: "内容を見て、よければ「AIでつくる」を押してください。" },
  { id: "summer", group: "season", label: "夏休み・子どもの検診", theme: "free", topic: "夏休みに、子どものむし歯チェックと、仕上げみがきのおさらいをすすめる", next: "内容を見て、よければ「AIでつくる」を押してください。" },
  { id: "autumn", group: "season", label: "年末前のメンテナンス", theme: "free", topic: "年末がくる前に、定期検診とクリーニングを受けておくことをすすめる", next: "内容を見て、よければ「AIでつくる」を押してください。" },
  { id: "week", group: "season", label: "歯と口の健康週間(6/4〜10)", theme: "free", topic: "6月4日〜10日は「歯と口の健康週間」。お口の健康を、ふり返るきっかけにしてほしい", next: "内容を見て、よければ「AIでつくる」を押してください。" },
  { id: "eeha", group: "season", label: "いい歯の日(11/8)", theme: "free", topic: "11月8日は「いい歯の日」。お口の健康を、ふり返るきっかけにしてほしい", next: "内容を見て、よければ「AIでつくる」を押してください。" },
  { id: "newyear", group: "close", label: "年末年始の休診", theme: "close", next: DATE_NEXT },
  { id: "obon", group: "close", label: "お盆の休診", theme: "close", next: DATE_NEXT },
  { id: "gw", group: "close", label: "ゴールデンウィークの休診", theme: "close", next: DATE_NEXT },
  { id: "temp", group: "close", label: "臨時休診", theme: "close", next: DATE_NEXT },
  { id: "white", group: "campaign", label: "ホワイトニング", theme: "campaign", menus: ["ホワイトニング"], next: "メニューの名前を直して、金額と期間を入れてから、「AIでつくる」を押してください。" },
  { id: "clean", group: "campaign", label: "歯のクリーニング", theme: "campaign", menus: ["歯のクリーニング"], next: "メニューの名前を直して、金額と期間を入れてから、「AIでつくる」を押してください。" },
];
