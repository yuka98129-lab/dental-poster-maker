"use client";

import { useLayoutEffect, type RefObject } from "react";

/** ポスター(またはSNS画像)の中身が、枠からはみ出していないか */
function overflowing(root: HTMLElement): boolean {
  if (root.scrollHeight > root.clientHeight + 1) return true;
  const body = root.querySelector<HTMLElement>(".sn-body");
  if (body && body.scrollHeight > body.clientHeight + 1) return true;
  const panel = root.querySelector<HTMLElement>(".cp-panel");
  if (panel && panel.scrollHeight > panel.clientHeight + 1) return true;
  const footer = root.querySelector<HTMLElement>("footer");
  if (footer) {
    const top = footer.getBoundingClientRect().top;
    for (const it of Array.from(root.querySelectorAll<HTMLElement>(".cp-item"))) if (it.getBoundingClientRect().bottom > top - 2) return true;
    // ふつうのポスター(型: ふつう・サイドバー・大見出し)。ポイントが下の帯に重なる・帯が下にはみ出す
    for (const li of Array.from(root.querySelectorAll<HTMLElement>(".poster > ul li, .pl-body ul li, .pl-main ul li"))) if (li.getBoundingClientRect().bottom > top - 1) return true;
    if (footer.getBoundingClientRect().bottom > root.getBoundingClientRect().bottom + 1) return true;
  }
  // 大見出し型は、上の見出しの面が、ポスターの高さの4割を超えないようにする
  const hero = root.querySelector<HTMLElement>(".pl-hero");
  if (hero && hero.getBoundingClientRect().height > root.getBoundingClientRect().height * 0.42) return true;
  const photo = root.querySelector<HTMLElement>(".art.has-photo");
  if (photo && photo.getBoundingClientRect().height < root.getBoundingClientRect().width * 0.14) return true;
  return false;
}

/**
 * 入りきらないときは、文字とカードを、少しずつ小さくする(--fit。1 → 下限 0.5)。
 * 大きさは、幅に合わせて決まる(cqw)ので、画面の大きさがちがっても、同じ結果になる。
 */
export function useFit(ref: RefObject<HTMLElement | null>, signature: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      let f = 1;
      el.style.setProperty("--fit", "1");
      while (f > 0.5 && overflowing(el)) {
        f = Math.round((f - 0.04) * 100) / 100;
        el.style.setProperty("--fit", String(f));
      }
    };
    fit();
    void document.fonts?.ready.then(fit);
  }, [ref, signature]);
}
