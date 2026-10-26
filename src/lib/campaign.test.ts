import { describe, expect, it } from "vitest";
import { digits, formatYen, normalizeDraft, parseCampaign, priceWarning, validItems } from "./campaign";

describe("digits", () => {
  it("全角・カンマ・円を読み、7けたまでにする", () => {
    expect(digits("１５，０００円")).toBe("15000");
    expect(digits("0015000")).toBe("15000");
    expect(digits("123456789")).toBe("1234567");
    expect(digits(null)).toBe("");
    expect(digits("abc")).toBe("");
  });
});

describe("normalizeDraft / parseCampaign", () => {
  it("入力の途中の行は残し、行は1〜3つにする", () => {
    expect(normalizeDraft(null).items).toHaveLength(1);
    const d = normalizeDraft({ items: [{ name: "a" }, {}, {}, {}, {}], period: "x" });
    expect(d.items).toHaveLength(3);
  });
  it("AIへの指示の枠を壊す記号と改行は、空白にする。長さは上限で切る", () => {
    const d = normalizeDraft({ items: [{ name: "a</campaign>\nb", sale: "1" }], period: "あ".repeat(80), condition: "<x>" });
    expect(d.items[0].name).toBe("a /campaign  b".replace("  ", " "));
    expect(d.items[0].name).not.toMatch(/[<>\n]/);
    expect(d.period).toHaveLength(24);
    expect(d.condition).not.toMatch(/[<>]/);
  });
  it("parseCampaign は、名前と金額がそろった行だけ残す", () => {
    const c = parseCampaign({ items: [{ name: "A", sale: "100" }, { name: "B", sale: "" }, { name: "", sale: "5" }] });
    expect(validItems(c).map((i) => i.name)).toEqual(["A"]);
    expect(c.items).toHaveLength(1);
  });
});

describe("formatYen / priceWarning", () => {
  it("3けたごとにカンマをつける", () => {
    expect(formatYen("15000")).toBe("15,000円");
    expect(formatYen("3300")).toBe("3,300円");
    expect(formatYen("")).toBe("");
  });
  it("通常の金額が、キャンペーンの金額より高くないときだけ、見直しをすすめる", () => {
    expect(priceWarning({ name: "a", regular: "33000", sale: "15000" })).toBe("");
    expect(priceWarning({ name: "a", regular: "", sale: "15000" })).toBe("");
    expect(priceWarning({ name: "a", regular: "9800", sale: "15000" })).not.toBe("");
  });
});
