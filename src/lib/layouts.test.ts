import { describe, expect, it } from "vitest";
import { campaignLayoutOf, infoLayoutOf, INFO_LAYOUTS, CAMPAIGN_LAYOUTS } from "./options";
import { sanitizeSaved } from "./saved";

describe("ポスターの型", () => {
  it("一般ポスターの型は3つ、キャンペーンの型は2つ", () => {
    expect(INFO_LAYOUTS.map((l) => l.id)).toEqual(["std", "side", "sun"]);
    expect(CAMPAIGN_LAYOUTS.map((l) => l.id)).toEqual(["badge", "cards"]);
  });
  it("別の種類の型や、知らない値は、その種類の初めの型になる", () => {
    expect(infoLayoutOf("badge")).toBe("std");
    expect(infoLayoutOf("zzz")).toBe("std");
    expect(infoLayoutOf("side")).toBe("side");
    expect(campaignLayoutOf("sun")).toBe("badge");
    expect(campaignLayoutOf("cards")).toBe("cards");
  });
  it("保存した内容の型は、新しい型でも読み込める", () => {
    const out = sanitizeSaved([{ id: "a", name: "n", layout: "sun" }, { id: "b", name: "n", layout: "bad" }]);
    expect(out[0].layout).toBe("sun");
    expect(out[1].layout).toBe("badge");
  });
});
