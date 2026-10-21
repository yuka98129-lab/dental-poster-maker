"use client";

import type { Clinic } from "../lib/clinic";
import type { DesignId } from "../lib/options";
import type { Poster as PosterData } from "../lib/parse";
import { Editable } from "./Editable";

type Props = { poster: PosterData; design: DesignId; clinic: Clinic; onChange: (p: PosterData) => void };

const ToothArt = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="tooth">
    <path d="M7.5 3C5 3 3.5 5 3.5 7.5c0 2 .7 3.4 1.2 5 .6 2 .6 4.5 1.6 7 .4 1 1.4 1.5 2.2 1 1-.6 1.2-2.6 1.8-4 .3-.8.8-1.2 1.4-1.2h.6c.6 0 1.1.4 1.4 1.2.6 1.4.8 3.4 1.8 4 .8.5 1.8 0 2.2-1 1-2.5 1-5 1.6-7 .5-1.6 1.2-3 1.2-5C21.5 5 20 3 17.5 3c-2.2 0-3.2 1-5.5 1S9.7 3 7.5 3z" />
  </svg>
);

/** A4 のポスター。文字の大きさは、ポスターの幅に合わせて決まるので、印刷しても、画面と同じ見た目になる */
export function Poster({ poster, design, clinic, onChange }: Props) {
  const set = (patch: Partial<PosterData>) => onChange({ ...poster, ...patch });
  const setPoint = (i: number, patch: Partial<PosterData["points"][number]>) =>
    set({ points: poster.points.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  return (
    <div className="poster-box print-area">
      <div className={`poster d-${design}`}>
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
        <div className="art">
          <ToothArt />
        </div>
        <footer>
          {clinic.closing && <p className="closing">{clinic.closing}</p>}
          <strong>{clinic.name || "(医院名)"}</strong>
          {(clinic.hours || clinic.phone) && (
            <span>
              {clinic.hours}
              {clinic.hours && clinic.phone ? " / " : ""}
              {clinic.phone}
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}
