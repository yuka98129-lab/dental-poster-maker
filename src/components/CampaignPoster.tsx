"use client";

import { useRef, type CSSProperties } from "react";
import { formatYen, validItems, type Campaign } from "../lib/campaign";
import { brandVars } from "../lib/color";
import type { Clinic } from "../lib/clinic";
import type { DesignId, LayoutId, TasteId } from "../lib/options";
import type { QrSettings } from "../lib/qr";
import type { Poster as PosterData } from "../lib/parse";
import { Editable } from "./Editable";
import { Art, PosterFooter, qrFor, ToothArt } from "./PosterParts";
import { useFit } from "./useFit";

type Props = { poster: PosterData; design: DesignId; layout: LayoutId; brand: string; taste: TasteId; qr?: QrSettings; photo?: string | null; ts?: number; clinic: Clinic; campaign: Campaign; onChange: (p: PosterData) => void };

/** 期間の文字の長さに合わせて、大きさを変える(長い文字が、まるからはみ出さないように) */
const sizeOf = (s: string) => (s.length <= 7 ? "l" : s.length <= 12 ? "m" : "s");

export function Menu({ campaign }: { campaign: Campaign }) {
  return (
    <>
      {validItems(campaign).map((it, i) => (
        <div className="cp-item" key={i}>
          <span className="nm">{it.name}</span>
          <div className="pr">
            {it.regular && (
              <>
                <span className="reg">通常 {formatYen(it.regular)}</span>
                <span className="arr" aria-hidden="true">
                  ↓
                </span>
              </>
            )}
            <strong className={`sale${formatYen(it.sale).length >= 9 ? " long" : ""}`}>{formatYen(it.sale)}</strong>
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * キャンペーン(料金・期間)のポスター。金額・期間・条件は、入力欄の内容をそのまま出す(AIは、文章だけ)。
 * 型は2つ: badge(期間を大きなまるに、メニューを縦に)、cards(メニューをカードで横に)
 */
export function CampaignPoster({ poster, design, layout, brand, taste, qr, photo = null, ts = 1, clinic, campaign, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFit(ref, JSON.stringify([poster, clinic, campaign, ts, photo ? 1 : 0, qr, design, taste, layout]));
  const set = (patch: Partial<PosterData>) => onChange({ ...poster, ...patch });
  const setPoint = (i: number, patch: Partial<PosterData["points"][number]>) =>
    set({ points: poster.points.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const n = validItems(campaign).length;
  const period = campaign.period;
  // 医院名などが長いと、下の帯が高くなるので、カード型は、ポイントを1つに減らす
  const tight = clinic.name.length > 14 || clinic.closing.length > 14 || clinic.hours.length + clinic.phone.length > 28;
  return (
    <div className="poster-box print-area">
      <div ref={ref} data-n={n} data-qr={qrFor(qr) ? "" : undefined} data-tight={tight ? "" : undefined} data-photo={photo ? "" : undefined} className={`poster cp cp-${layout} d-${design} t-${taste}`} style={{ ...(design === "custom" ? brandVars(brand) : {}), ...(photo ? { "--photo": `url("${photo}")` } : {}), "--n": n, "--ts": ts, "--s": (n <= 1 ? 1.04 : n === 2 ? 0.92 : 0.76) * ts } as CSSProperties}>
        {layout === "badge" ? (
          <>
            <div className="cp-top">
              <Editable as="h3" value={poster.title} onChange={(v) => set({ title: v })} label="タイトル" />
              {poster.catchcopy && <Editable as="p" className="catch" value={poster.catchcopy} onChange={(v) => set({ catchcopy: v })} label="ポスターのひとこと" />}
            </div>
            <div className="cp-main">
              <div className="cp-left">
                <Art photo={photo} />
                {(period || campaign.condition) && (
                  <div className="cp-circle">
                    {period && <span className="lab">キャンペーン期間</span>}
                    {campaign.condition && <span className="cond">{campaign.condition}</span>}
                    {period && <strong className={`per ${sizeOf(period)}`}>{period}</strong>}
                  </div>
                )}
              </div>
              <div className="cp-menus">
                <Menu campaign={campaign} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="cp-hero">
              <div className="cp-hero-text">
                <Editable as="h3" value={poster.title} onChange={(v) => set({ title: v })} label="タイトル" />
                {poster.catchcopy && <Editable as="p" className="catch" value={poster.catchcopy} onChange={(v) => set({ catchcopy: v })} label="ポスターのひとこと" />}
              </div>
              {period ? (
                <div className="cp-round">
                  <strong className={`per ${sizeOf(period)}`}>{period}</strong>
                </div>
              ) : (
                <div className="art">
                  <ToothArt />
                </div>
              )}
            </div>
            <ul className="cp-points">
              {poster.points.map((p, i) => (
                <li key={i}>
                  <span className="ck" aria-hidden="true">
                    ✓
                  </span>
                  <Editable as="span" value={p.text} onChange={(v) => setPoint(i, { text: v })} label={`ポイント${i + 1}の文`} />
                </li>
              ))}
            </ul>
            <div className="cp-panel">
              <div className="cp-cards">
                <Menu campaign={campaign} />
              </div>
              {campaign.condition && <p className="cp-cond">{campaign.condition}</p>}
            </div>
          </>
        )}
        <PosterFooter clinic={clinic} qr={qr} />
      </div>
    </div>
  );
}
