import { describe, expect, it } from "vitest";
import { checkText } from "./ad-check";

describe("checkText", () => {
  it("言い切り・比較・保証などの表現を見つける", () => {
    expect(checkText("痛くない治療をめざします").map((f) => f.word)).toEqual(["痛くない"]);
    expect(checkText("必ず治ります").map((f) => f.word)).toEqual(["必ず", "治ります"]);
    expect(checkText("地域No.1の医院").length).toBe(1);
    expect(checkText("ビフォーアフターをご覧ください")[0].hint).toContain("体験談");
  });
  it("「○」が残っていたら知らせる", () => {
    expect(checkText("○月○日から診療").some((f) => f.hint.includes("入れてください"))).toBe(true);
  });
  it("問題のない文章では、何も出ない。同じ言葉は1回だけ", () => {
    expect(checkText("おうちでのケアのコツを、お伝えします。")).toEqual([]);
    expect(checkText("必ず、必ず").length).toBe(1);
  });
});
