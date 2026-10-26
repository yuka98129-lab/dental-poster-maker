import { describe, expect, it } from "vitest";
import { brandVars, contrastWithWhite, DEFAULT_BRAND, isHex } from "./color";

describe("isHex", () => {
  it("#と6けたの16進数だけを受け付ける", () => {
    expect(isHex("#1e3f7a")).toBe(true);
    expect(isHex("#FFF")).toBe(false);
    expect(isHex("red")).toBe(false);
    expect(isHex(null)).toBe(false);
  });
});

describe("brandVars", () => {
  it("濃い色は、そのまま帯の色になる", () => {
    expect(brandVars("#1e3f7a")["--pd"]).toBe("#1e3f7a");
  });
  it("明るい色は、白い文字が読める濃さまで暗くする(黄色でも、白でも)", () => {
    for (const c of ["#ffd25e", "#ffffff", "#7fe0d2"]) {
      expect(contrastWithWhite(brandVars(c)["--pd"])).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("やわらかい面は、帯より明るい。おかしな値は、初めの色にする", () => {
    const v = brandVars("#1e3f7a");
    expect(contrastWithWhite(v["--pbg"])).toBeLessThan(1.3);
    expect(brandVars("nonsense")["--pd"]).toBe(brandVars(DEFAULT_BRAND)["--pd"]);
  });
});
