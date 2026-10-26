import { describe, expect, it } from "vitest";
import { cleanUrl, normalizeQr, qrShape } from "./qr";

describe("cleanUrl", () => {
  it("http / https だけ使い、整えて返す。日本語は、%の形にする", () => {
    expect(cleanUrl(" https://example.com/yoyaku ")).toBe("https://example.com/yoyaku");
    expect(cleanUrl("https://example.com/予約")).toBe("https://example.com/%E4%BA%88%E7%B4%84");
    expect(cleanUrl("javascript:alert(1)")).toBeNull();
    expect(cleanUrl("example.com")).toBeNull();
    expect(cleanUrl("")).toBeNull();
    expect(cleanUrl("ftp://example.com")).toBeNull();
  });
});

describe("qrShape", () => {
  it("まわりの余白(4マス)を入れた大きさと、黒いマスの道すじを返す", () => {
    const s = qrShape("https://example.com/");
    expect(s).not.toBeNull();
    // バージョン1〜: 21マス + 余白8マス以上
    expect(s!.size).toBeGreaterThanOrEqual(29);
    expect(s!.d.startsWith("M")).toBe(true);
    expect(qrShape("https://example.com/")).toEqual(s); // 同じURLなら、同じ図
    expect(qrShape("https://example.com/a")).not.toEqual(s);
  });
  it("URLでないものや、長すぎるものは、null", () => {
    expect(qrShape("nonsense")).toBeNull();
    expect(qrShape("https://example.com/" + "a".repeat(3000))).toBeNull();
  });
});

describe("normalizeQr", () => {
  it("おかしな値は、初めの設定にする。名前は8文字まで", () => {
    expect(normalizeQr(null)).toEqual({ on: false, url: "", label: "ご予約はこちら" });
    expect(normalizeQr({ on: true, url: " https://a.example/ ", label: "あ".repeat(20) })).toMatchObject({ on: true, url: "https://a.example/", label: "あ".repeat(8) });
    expect(normalizeQr({ on: "yes" }).on).toBe(false);
  });
});
