import { describe, expect, it } from "vitest";
import { DEFAULT_CLINIC } from "./clinic";
import { endDate, proofread } from "./proofread";

const today = new Date(2026, 9, 5); // 2026-10-05
const clinic = { ...DEFAULT_CLINIC, name: "さくら歯科(例)", phone: "048-299-6663" };
const campaign = { items: [{ name: "オフィスホワイトニング", regular: "33000", sale: "15000" }], period: "10/31まで", condition: "" };
const fixes = (i: ReturnType<typeof proofread>) => i.filter((x) => x.level === "fix").map((x) => x.text);

describe("endDate", () => {
  it("いろいろな書き方の、終わりの日付を読む", () => {
    expect(endDate("10/31まで", today)).toEqual(new Date(2026, 9, 31));
    expect(endDate("10月1日〜10月31日", today)).toEqual(new Date(2026, 9, 31));
    expect(endDate("2026年12月25日まで", today)).toEqual(new Date(2026, 11, 25));
    expect(endDate("１０／３１まで", today)).toEqual(new Date(2026, 9, 31));
    expect(endDate("平日限定", today)).toBeNull();
    expect(endDate("13/45", today)).toBeNull();
  });
  it("半年以上前の月日は、来年とみなす", () => {
    expect(endDate("1/31まで", new Date(2026, 11, 20))).toEqual(new Date(2027, 0, 31));
  });
});

describe("proofread", () => {
  it("そろっていれば、直すものはない", () => {
    expect(fixes(proofread({ clinic, campaign, texts: ["題"], today }))).toEqual([]);
  });
  it("医院名・電話・期間の、抜けを見つける", () => {
    const f = fixes(proofread({ clinic: DEFAULT_CLINIC, campaign: { ...campaign, period: "" }, texts: [], today }));
    expect(f.some((t) => t.includes("医院名"))).toBe(true);
    expect(f.some((t) => t.includes("電話番号が入っていません"))).toBe(true);
    expect(f.some((t) => t.includes("期間が入っていません"))).toBe(true);
  });
  it("電話番号のけた数が合わないと、知らせる。全角でも読める", () => {
    expect(fixes(proofread({ clinic: { ...clinic, phone: "048-299-666" }, texts: [], today })).some((t) => t.includes("9けた"))).toBe(true);
    expect(fixes(proofread({ clinic: { ...clinic, phone: "０４８－２９９－６６６３" }, texts: [], today }))).toEqual([]);
  });
  it("電話がなくても、QRコードがあれば、抜けとは言わない", () => {
    const qr = { on: true, url: "https://example.com/", label: "予約" };
    expect(fixes(proofread({ clinic: { ...clinic, phone: "" }, qr, texts: [], today }))).toEqual([]);
  });
  it("過ぎた期間・「○」の残り・通常の金額の入れ間違いを見つける", () => {
    expect(fixes(proofread({ clinic, campaign: { ...campaign, period: "9/30まで" }, texts: [], today })).some((t) => t.includes("今日より前"))).toBe(true);
    expect(fixes(proofread({ clinic, texts: ["○月○日から"], today })).some((t) => t.includes("「○」"))).toBe(true);
    expect(fixes(proofread({ clinic, campaign: { ...campaign, items: [{ name: "A", regular: "100", sale: "200" }] }, texts: [], today })).length).toBe(1);
  });
  it("QRコードのURLが正しくないと、知らせる。長いURLは、お知らせ", () => {
    expect(fixes(proofread({ clinic, qr: { on: true, url: "yoyaku", label: "" }, texts: [], today })).some((t) => t.includes("QRコード"))).toBe(true);
    const long = proofread({ clinic, qr: { on: true, url: "https://example.com/" + "a".repeat(80), label: "" }, texts: [], today });
    expect(long.some((x) => x.level === "info" && x.text.includes("長い"))).toBe(true);
  });
  it("料金があるときは、医療広告についての、お知らせを出す", () => {
    expect(proofread({ clinic, campaign, texts: [], today }).some((x) => x.level === "info" && x.text.includes("医療広告"))).toBe(true);
  });
});
