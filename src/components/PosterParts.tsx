/* eslint-disable @next/next/no-img-element -- 写真は、端末の中のデータ(data URL)なので、画像の最適化は使わない */
import type { Clinic } from "../lib/clinic";
import { qrShape, type QrSettings } from "../lib/qr";

export const ToothArt = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="tooth">
    <path d="M7.5 3C5 3 3.5 5 3.5 7.5c0 2 .7 3.4 1.2 5 .6 2 .6 4.5 1.6 7 .4 1 1.4 1.5 2.2 1 1-.6 1.2-2.6 1.8-4 .3-.8.8-1.2 1.4-1.2h.6c.6 0 1.1.4 1.4 1.2.6 1.4.8 3.4 1.8 4 .8.5 1.8 0 2.2-1 1-2.5 1-5 1.6-7 .5-1.6 1.2-3 1.2-5C21.5 5 20 3 17.5 3c-2.2 0-3.2 1-5.5 1S9.7 3 7.5 3z" />
  </svg>
);

/** 絵の場所。写真があれば写真、なければ歯のマーク */
export function Art({ photo }: { photo?: string | null }) {
  return (
    <div className={`art${photo ? " has-photo" : ""}`}>
      {photo ? <img src={photo} alt="" /> : <ToothArt />}
    </div>
  );
}

/** ポスターに置く、QRコードの図が、あるか(オンで、URLが正しいとき) */
export const qrFor = (qr?: QrSettings) => (qr?.on ? qrShape(qr.url) : null);

/** QRコード。まわりの白い余白(4マス)まで入れた図なので、背景が暗くても、読み取れる */
export function QrBlock({ qr }: { qr: QrSettings }) {
  const shape = qrFor(qr);
  if (!shape) return null;
  return (
    <div className="qr">
      <svg viewBox={`0 0 ${shape.size} ${shape.size}`} role="img" aria-label="QRコード" shapeRendering="crispEdges">
        <rect width={shape.size} height={shape.size} fill="#fff" />
        <path d={shape.d} fill="#000" />
      </svg>
      {qr.label && <span>{qr.label}</span>}
    </div>
  );
}

/** ポスターの一番下の、医院の案内。医院名・電話などは、画面で入れたものだけを使う */
export function PosterFooter({ clinic, qr }: { clinic: Clinic; qr?: QrSettings }) {
  return (
    <footer>
      <div className="ft">
        {clinic.closing && <p className="closing">{clinic.closing}</p>}
        <strong>{clinic.name || "(医院名)"}</strong>
        {(clinic.hours || clinic.phone) && (
          <span>
            {clinic.hours}
            {clinic.hours && clinic.phone ? " / " : ""}
            {clinic.phone}
          </span>
        )}
      </div>
      {qr && <QrBlock qr={qr} />}
    </footer>
  );
}
