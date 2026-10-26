import { describe, expect, it } from "vitest";
import { CAMPAIGN_LIMITS } from "./campaign";
import { LIMITS, THEMES, themesFor } from "./options";
import { fitSize } from "./photo";
import { TEMPLATE_GROUPS, TEMPLATES } from "./templates";
import { PNG_WIDTH, SIZES, textScale } from "./sizes";

describe("テンプレート", () => {
  it("すべて、医院の発信で使えるテーマで、IDが重ならず、グループがある", () => {
    const ids = new Set<string>();
    for (const t of TEMPLATES) {
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(THEMES.some((x) => x.id === t.theme)).toBe(true);
      expect(themesFor("clinic").some((x) => x.id === t.theme)).toBe(true);
      expect(TEMPLATE_GROUPS.some((g) => g.id === t.group)).toBe(true);
      expect(t.next.length).toBeGreaterThan(0);
    }
  });
  it("「自由に書く」には内容があり、上限に収まる。日付と金額の数字は、入れない", () => {
    for (const t of TEMPLATES) {
      if (t.theme === "free") {
        expect(t.topic && t.topic.length > 0).toBe(true);
        expect((t.topic ?? "").length).toBeLessThanOrEqual(LIMITS.topic);
      }
      expect(t.menus === undefined || t.theme === "campaign").toBe(true);
      for (const m of t.menus ?? []) expect(m.length).toBeLessThanOrEqual(CAMPAIGN_LIMITS.name);
      expect(/[0-9]+円/.test(t.topic ?? "")).toBe(false);
    }
  });
  it("休診のテンプレートは、日付を入れるよう案内する", () => {
    for (const t of TEMPLATES.filter((x) => x.theme === "close")) expect(t.next).toContain("日付");
  });
});

describe("写真・大きさ", () => {
  it("写真は、長いほうの辺が上限になるように縮める。小さい写真は、そのまま", () => {
    expect(fitSize(4000, 3000, 1400)).toEqual({ w: 1400, h: 1050 });
    expect(fitSize(3000, 4000, 1400)).toEqual({ w: 1050, h: 1400 });
    expect(fitSize(800, 600, 1400)).toEqual({ w: 800, h: 600 });
  });
  it("画像の大きさ・文字の大きさの選択肢", () => {
    expect(SIZES.map((s) => s.id)).toEqual(["a4", "sq", "story"]);
    expect(PNG_WIDTH.sq).toBe(1080);
    expect(textScale("s")).toBeLessThan(textScale("m"));
    expect(textScale("l")).toBeGreaterThan(textScale("m"));
  });
});
