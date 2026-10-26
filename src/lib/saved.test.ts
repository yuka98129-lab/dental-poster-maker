import { describe, expect, it } from "vitest";
import { defaultName, MAX_SAVED, removeSaved, sanitizeSaved, upsertSaved, type SavedCampaign } from "./saved";

const entry = (id: string, extra: Partial<SavedCampaign> = {}): SavedCampaign => ({
  id, name: id, savedAt: 1, campaign: { items: [{ name: "A", regular: "", sale: "100" }], period: "10/31まで", condition: "" },
  design: "navy", layout: "badge", taste: "clean", qr: { on: false, url: "", label: "ご予約はこちら" }, brand: "", poster: null, ...extra,
});

describe("sanitizeSaved", () => {
  it("壊れたものは捨て、選択肢にない値は、初めの値にする", () => {
    const out = sanitizeSaved([null, { id: 1 }, { id: "x", name: "ok", design: "evil", layout: "zzz", brand: "red", campaign: { items: [{ name: "<b>", sale: "5" }] }, poster: { title: "" } }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "x", design: "navy", layout: "badge", brand: "", poster: null });
    expect(out[0].campaign.items[0].name).not.toMatch(/[<>]/);
    expect(sanitizeSaved("x")).toEqual([]);
  });
  it("テイストとQRコードの設定も、整えて残す。おかしな値は、初めの値", () => {
    const out = sanitizeSaved([{ id: "x", name: "n", taste: "luxury", qr: { on: true, url: "https://a.example/", label: "予約" } }, { id: "y", name: "n", taste: "evil", qr: 5 }]);
    expect(out[0].taste).toBe("luxury");
    expect(out[0].qr).toEqual({ on: true, url: "https://a.example/", label: "予約" });
    expect(out[1].taste).toBe("clean");
    expect(out[1].qr.on).toBe(false);
  });
  it("ポスターの文章も、整えて残す", () => {
    const out = sanitizeSaved([{ id: "x", name: "n", design: "custom", brand: "#112233", poster: { badge: "", title: "題", catchcopy: "", points: [{ label: "1", text: "a" }] } }]);
    expect(out[0].design).toBe("custom");
    expect(out[0].brand).toBe("#112233");
    expect(out[0].poster?.title).toBe("題");
  });
});

describe("upsertSaved / removeSaved", () => {
  it("新しいものが先頭。同じ id は置き換え。20件まで", () => {
    let list: SavedCampaign[] = [];
    for (let i = 0; i < MAX_SAVED + 5; i++) list = upsertSaved(list, entry(`e${i}`));
    expect(list).toHaveLength(MAX_SAVED);
    expect(list[0].id).toBe(`e${MAX_SAVED + 4}`);
    list = upsertSaved(list, entry("e10", { name: "新しい名前" }));
    expect(list[0].name).toBe("新しい名前");
    expect(list.filter((x) => x.id === "e10")).toHaveLength(1);
    expect(removeSaved(list, "e10").some((x) => x.id === "e10")).toBe(false);
  });
});

describe("defaultName", () => {
  it("メニューの名前と期間から、名前をつくる", () => {
    expect(defaultName(entry("a").campaign)).toBe("A 10/31まで");
    expect(defaultName({ items: [], period: "", condition: "" })).toBe("キャンペーン");
  });
});
