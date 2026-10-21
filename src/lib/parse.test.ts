import { describe, expect, it } from "vitest";
import { normalizeTags, parsePosts, parsePoster, parseScripts } from "./parse";

describe("parsePoster", () => {
  it("題名と、1つ以上のポイントがあれば受け取る。空のポイントは捨てる", () => {
    const p = parsePoster({ badge: "お知らせ", title: "検診へ\nいこう", catchcopy: "安心です", points: [{ label: "1", text: "クリーニング" }, { label: "2", text: "" }, "x"] });
    expect(p?.title).toBe("検診へ\nいこう");
    expect(p?.points).toEqual([{ label: "1", text: "クリーニング" }]);
  });
  it("題名なし・ポイントなしは null", () => {
    expect(parsePoster({ title: "", points: [{ label: "1", text: "a" }] })).toBeNull();
    expect(parsePoster({ title: "a", points: [] })).toBeNull();
    expect(parsePoster("x")).toBeNull();
  });
});

describe("normalizeTags", () => {
  it("# を付け、空白を除き、重複を除き、5個まで", () => {
    expect(normalizeTags(["#歯みがき", "歯 みがき", "＃検診", "a", "b", "c", "d"])).toEqual(["#歯みがき", "#歯みがき".replace("歯みがき", "検診"), "#a", "#b", "#c"].filter((v, i, a) => a.indexOf(v) === i));
  });
  it("配列でなければ空", () => expect(normalizeTags("x")).toEqual([]));
});

describe("parsePosts", () => {
  it("本文のある案だけを、3案まで", () => {
    const posts = parsePosts([{ label: "A", body: "本文1", tags: ["x"] }, { label: "B", body: "" }, { body: "本文3" }, { body: "4" }, { body: "5" }]);
    expect(posts.map((p) => p.body)).toEqual(["本文1", "本文3", "4"]);
    expect(posts[1].label).toBe("案2");
  });
});

describe("parseScripts", () => {
  const scene = (say: string) => ({ say, text: "" });
  it("最初の一言と、2つ以上の場面があるものだけ受け取る", () => {
    const r = parseScripts([
      { label: "A", hook: "ねえ", scenes: [scene("1"), scene("2")], caption: "c", tags: ["x"] },
      { label: "B", hook: "", scenes: [scene("1"), scene("2")] },
      { label: "C", hook: "ねえ", scenes: [scene("1")] },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].tags).toEqual(["#x"]);
  });
});
