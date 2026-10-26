"use client";

import { useRef, type CSSProperties } from "react";
import { validItems, type Campaign } from "../lib/campaign";
import { brandVars } from "../lib/color";
import type { Clinic } from "../lib/clinic";
import type { DesignId, TasteId } from "../lib/options";
import type { QrSettings } from "../lib/qr";
import type { Poster as PosterData } from "../lib/parse";
import { Menu } from "./CampaignPoster";
import { PosterFooter, qrFor } from "./PosterParts";
import { useFit } from "./useFit";

type Props = {
  poster: PosterData;
  design: DesignId;
  brand: string;
  taste: TasteId;
  qr?: QrSettings;
  clinic: Clinic;
  campaign?: Campaign;
  photo?: string | null;
  ts: number;
  ratio: "sq" | "story";
};

/** タイトルの長さに合わせて、文字の大きさを変える(長いタイトルが、はみ出さないように) */
const titleSize = (t: string) => (t.replace(/\s/g, "").length <= 12 ? "l" : t.replace(/\s/g, "").length <= 24 ? "m" : "s");
const periodSize = (s: string) => (s.length <= 10 ? "l" : s.length <= 16 ? "m" : "s");

/**
 * SNS用の画像(正方形・ストーリーズ)。A4ポスターの文章・金額・期間を、そのまま使う(直すときは、A4の画面で直す)。
 * 正方形は 1:1、ストーリーズは 9:16(上下は、アプリの表示で隠れやすいので、あけてある)。
 */
export function SnsCard({ poster, design, brand, taste, qr, clinic, campaign, photo = null, ts, ratio }: Props) {
  const items = campaign ? validItems(campaign) : [];
  const n = items.length;
  const period = campaign?.period ?? "";
  const tight = clinic.name.length > 14 || clinic.closing.length > 14 || clinic.hours.length + clinic.phone.length > 28;
  const base = ratio === "story" ? (n <= 1 ? 1.18 : n === 2 ? 1.1 : 1.0) : n <= 1 ? 1.0 : n === 2 ? 0.86 : 0.7;
  const style = {
    ...(design === "custom" ? brandVars(brand) : {}),
    ...(photo ? { "--photo": `url("${photo}")` } : {}),
    "--n": Math.max(1, n),
    "--ts": ts,
    "--s": base * ts,
  } as CSSProperties;
  const ref = useRef<HTMLDivElement>(null);
  const sig = JSON.stringify([poster, campaign, clinic, ts, photo ? 1 : 0, ratio, qr, design, taste]);
  useFit(ref, sig);
  return (
    <div className="poster-box sns-box no-print">
      <div ref={ref} className={`poster sns sns-${ratio} d-${design} t-${taste}`} data-cp={campaign && n > 0 ? "" : undefined} data-n={n} data-qr={qrFor(qr) ? "" : undefined} data-tight={tight ? "" : undefined} data-photo={photo ? "" : undefined} style={style}>
        <div className="sn-head">
          {poster.badge && <span className="sn-badge">{poster.badge}</span>}
          <h3 className={`ts-${titleSize(poster.title)}`}>{poster.title}</h3>
          {poster.catchcopy && <p className="catch">{poster.catchcopy}</p>}
        </div>
        <div className="sn-body">
          {campaign && n > 0 ? (
            <>
              {period && (
                <div className="sn-period">
                  <span>期間</span>
                  <strong className={`pz-${periodSize(period)}`}>{period}</strong>
                </div>
              )}
              <div className="sn-menus">
                <Menu campaign={campaign} />
              </div>
              {campaign.condition && <p className="sn-cond">{campaign.condition}</p>}
            </>
          ) : (
            <ul className="sn-points">
              {poster.points.map((p, i) => (
                <li key={i}>
                  <span className="pl">{p.label}</span>
                  <span className="pt">{p.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <PosterFooter clinic={clinic} qr={qr} />
      </div>
    </div>
  );
}
