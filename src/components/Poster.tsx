"use client";

import { useRef, type CSSProperties } from "react";
import { validItems, type Campaign } from "../lib/campaign";
import { brandVars } from "../lib/color";
import type { Clinic } from "../lib/clinic";
import type { DesignId, LayoutId, TasteId } from "../lib/options";
import type { QrSettings } from "../lib/qr";
import type { Poster as PosterData } from "../lib/parse";
import { CampaignPoster } from "./CampaignPoster";
import { Editable } from "./Editable";
import { Art, PosterFooter, qrFor } from "./PosterParts";
import { useFit } from "./useFit";

type Props = { poster: PosterData; design: DesignId; clinic: Clinic; campaign?: Campaign; layout?: LayoutId; brand?: string; taste?: TasteId; qr?: QrSettings; photo?: string | null; ts?: number; onChange: (p: PosterData) => void };

/** A4 のポスター。文字の大きさは、ポスターの幅に合わせて決まるので、印刷しても、画面と同じ見た目になる */
export function Poster({ poster, design, clinic, campaign, layout = "badge", brand = "", taste = "clean", qr, photo = null, ts = 1, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFit(ref, JSON.stringify([poster, clinic, ts, photo ? 1 : 0, qr, design, taste]));
  if (campaign && validItems(campaign).length > 0) return <CampaignPoster poster={poster} design={design} layout={layout} brand={brand} taste={taste} qr={qr} photo={photo} ts={ts} clinic={clinic} campaign={campaign} onChange={onChange} />;
  const set = (patch: Partial<PosterData>) => onChange({ ...poster, ...patch });
  const setPoint = (i: number, patch: Partial<PosterData["points"][number]>) =>
    set({ points: poster.points.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  return (
    <div className="poster-box print-area">
      <div ref={ref} className={`poster d-${design} t-${taste}`} data-qr={qrFor(qr) ? "" : undefined} style={{ ...(design === "custom" ? brandVars(brand) : {}), "--ts": ts } as CSSProperties}>
        {poster.badge && <Editable as="span" className="badge" value={poster.badge} onChange={(v) => set({ badge: v })} label="小さな見出し" />}
        <Editable as="h3" value={poster.title} onChange={(v) => set({ title: v })} label="タイトル" />
        {poster.catchcopy && <Editable as="p" className="catch" value={poster.catchcopy} onChange={(v) => set({ catchcopy: v })} label="ポスターのひとこと" />}
        <ul>
          {poster.points.map((p, i) => (
            <li key={i}>
              <Editable as="span" className="pl" value={p.label} onChange={(v) => setPoint(i, { label: v })} label={`ポイント${i + 1}の見出し`} />
              <Editable as="span" className="pt" value={p.text} onChange={(v) => setPoint(i, { text: v })} label={`ポイント${i + 1}の文`} />
            </li>
          ))}
        </ul>
        <Art photo={photo} />
        <PosterFooter clinic={clinic} qr={qr} />
      </div>
    </div>
  );
}
