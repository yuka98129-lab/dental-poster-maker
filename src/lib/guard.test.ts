import { describe, expect, it } from "vitest";
import { createRateLimiter, passcodeMatches, readPasscode } from "./guard";

describe("passcodeMatches", () => {
  it("同じ合言葉だけが通る", () => {
    expect(passcodeMatches("ひみつ123", "ひみつ123")).toBe(true);
    expect(passcodeMatches("ひみつ12", "ひみつ123")).toBe(false);
    expect(passcodeMatches(null, "ひみつ123")).toBe(false);
    expect(passcodeMatches("", "ひみつ123")).toBe(false);
  });
});

describe("readPasscode", () => {
  const req = (v?: string) => new Request("http://x/", { headers: v === undefined ? {} : { "x-passcode": v } });
  it("日本語の合言葉も、encodeURIComponent で送れば、元に戻る", () => {
    expect(readPasscode(req(encodeURIComponent("ひみつ123")))).toBe("ひみつ123");
    expect(readPasscode(req())).toBeNull();
    expect(readPasscode(req("%E0%A4%A"))).toBeNull();
  });
});

describe("createRateLimiter", () => {
  it("上限を超えたら true。時間がたつと戻る", () => {
    const over = createRateLimiter(2, 1000);
    expect(over("a", 0)).toBe(false);
    expect(over("a", 100)).toBe(false);
    expect(over("a", 200)).toBe(true);
    expect(over("b", 200)).toBe(false);
    expect(over("a", 5000)).toBe(false);
  });
});
