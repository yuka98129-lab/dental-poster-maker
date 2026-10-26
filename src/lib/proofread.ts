// 誤記・記載もれの自動チェック(AIではなく、決まった条件で調べる。毎回、同じ結果になる)
// 「要確認」は、直したほうがよいもの。「お知らせ」は、知っておいてほしいもの。
import { validItems, priceWarning, type Campaign } from "./campaign";
import type { Clinic } from "./clinic";
import { cleanUrl, QR_LONG_URL, type QrSettings } from "./qr";

export type Issue = { level: "fix" | "info"; text: string };

type Input = { clinic: Clinic; campaign?: Campaign; qr?: QrSettings; texts: string[]; today?: Date };

/** 電話番号の、数字だけ(全角・ハイフンは、そろえる) */
const phoneDigits = (s: string) => s.normalize("NFKC").replace(/\D/g, "");

/** 期間の文字から、最後の「月/日」を、日付にする。読めなければ null。年がなければ、今年(かなり前の月なら、来年)とみなす */
export function endDate(period: string, today: Date): Date | null {
  const s = period.normalize("NFKC");
  const all = [...s.matchAll(/(?:(\d{4})\s*年\s*)?(\d{1,2})\s*[月/.]\s*(\d{1,2})/g)];
  const m = all[all.length - 1];
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let year = m[1] ? Number(m[1]) : today.getFullYear();
  let d = new Date(year, month - 1, day);
  if (!m[1] && d.getTime() < today.getTime() - 1000 * 60 * 60 * 24 * 180) {
    year += 1; // 半年以上前の日付は、来年のことと考える(例: 12月に、1/31まで)
    d = new Date(year, month - 1, day);
  }
  return d.getMonth() === month - 1 ? d : null;
}

export function proofread({ clinic, campaign, qr, texts, today = new Date() }: Input): Issue[] {
  const out: Issue[] = [];
  const fix = (text: string) => out.push({ level: "fix", text });
  const info = (text: string) => out.push({ level: "info", text });

  if (!clinic.name.trim()) fix("医院名が入っていません。「医院の情報」に入れてください。");
  const url = qr?.on ? cleanUrl(qr.url) : null;
  if (!clinic.phone.trim()) {
    if (!url) fix("電話番号が入っていません(QRコードもありません)。問い合わせ先が、わかりません。");
  } else {
    const n = phoneDigits(clinic.phone);
    if (!/^0\d{9,10}$/.test(n)) fix(`電話番号の数字が、${n.length}けたです。入れ間違いがないか、見てください。`);
  }

  if (texts.some((t) => /[○〇]/.test(t))) fix("「○」が残っています。日付や数字を入れてください。");

  if (campaign) {
    const items = validItems(campaign);
    if (items.length === 0) fix("メニューと金額が、入っていません。");
    for (const i of campaign.items) {
      const w = priceWarning(i);
      if (w) fix(`${i.name || "メニュー"}: ${w}`);
      if (i.name && i.sale === "") fix(`「${i.name}」の、キャンペーンの金額が入っていません。`);
      if (i.sale !== "" && Number(i.sale) >= 1_000_000) info(`「${i.name || "メニュー"}」の金額が、100万円以上です。けたを、確かめてください。`);
    }
    const names = items.map((i) => i.name);
    if (new Set(names).size < names.length) info("同じ名前のメニューが、2つあります。");
    if (items.length > 0 && !campaign.period.trim()) fix("期間が入っていません。いつまでの価格か、わかりません。");
    const end = campaign.period ? endDate(campaign.period, today) : null;
    if (end) {
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (end.getTime() < startOfToday.getTime()) fix(`期間の終わり(${end.getMonth() + 1}月${end.getDate()}日)が、今日より前です。古い日付のままではありませんか。`);
    } else if (campaign.period.trim()) {
      info("期間の日付を、読み取れませんでした(「10/31まで」のような書き方なら、日付をチェックできます)。");
    }
    if (items.length > 0) info("料金は、院内の掲示だけなら、医療広告の対象外とされています。SNSやホームページで公開するときは、自由診療の料金に、治療の内容や、主なリスク・副作用の説明も、あわせて載せる必要があります。最終的な確認は、医院でお願いします。");
  }

  if (qr?.on) {
    if (!url) fix("QRコードのURLが、正しくありません(https:// から始まる、ページのURLを入れてください)。");
    else if (url.length > QR_LONG_URL) info("URLが長いので、QRコードが細かくなります。小さく印刷すると、読み取れないことがあります。短いURLだと、安心です。");
  }
  return out;
}
