"use client";

import { useRef, useState } from "react";
import { checkText } from "../lib/ad-check";
import type { Campaign } from "../lib/campaign";
import type { Clinic } from "../lib/clinic";
import type { DesignId, LayoutId, TasteId } from "../lib/options";
import { proofread } from "../lib/proofread";
import type { QrSettings } from "../lib/qr";
import type { Post, Poster as PosterData, Script } from "../lib/parse";
import { posterToPng, savePng } from "../lib/image";
import { PNG_WIDTH, SIZES, type SizeId } from "../lib/sizes";
import { Findings } from "./Findings";
import { Poster } from "./Poster";
import { qrFor } from "./PosterParts";
import { SnsCard } from "./SnsCard";
import { validItems } from "../lib/campaign";

function CopyButton({ text, label = "コピー" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      window.prompt("コピーできませんでした。ここから、コピーしてください。", text);
    }
  }
  return (
    <button type="button" className={`copy${done ? " done" : ""}`} onClick={() => void copy()}>
      {done ? "コピーしました" : label}
    </button>
  );
}

const tagsToText = (tags: string[]) => tags.join(" ");
const textToTags = (t: string) => t.split(/\s+/).filter(Boolean);

type PosterResultProps = {
  poster: PosterData;
  design: DesignId;
  clinic: Clinic;
  campaign?: Campaign;
  proofCampaign?: Campaign;
  layout?: LayoutId;
  brand?: string;
  taste?: TasteId;
  qr?: QrSettings;
  photo?: string | null;
  ts?: number;
  qrTested: boolean;
  onQrTested: (v: boolean) => void;
  onChange: (p: PosterData) => void;
  onAgain: () => void;
};

export function PosterResult({ poster, design, clinic, campaign, proofCampaign, layout, brand, taste, qr, photo = null, ts = 1, qrTested, onQrTested, onChange, onAgain }: PosterResultProps) {
  const [size, setSize] = useState<SizeId>("a4");
  const campaignTexts = campaign ? [...campaign.items.map((i) => i.name), campaign.period, campaign.condition] : [];
  const posterTexts = [poster.badge, poster.title, poster.catchcopy, ...poster.points.map((p) => p.text), clinic.closing, ...campaignTexts];
  const findings = checkText(...posterTexts);
  const issues = proofread({ clinic, campaign: proofCampaign ?? campaign, qr, texts: posterTexts });
  const fixCount = issues.filter((i) => i.level === "fix").length;
  const hasQr = Boolean(qrFor(qr));
  const boxRef = useRef<HTMLDivElement>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState("");
  const [pending, setPending] = useState<"print" | "image" | null>(null);
  async function saveImage() {
    const node = boxRef.current?.querySelector<HTMLElement>(".poster");
    if (!node) return;
    setImgBusy(true);
    setImgError("");
    try {
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      await savePng(await posterToPng(node, PNG_WIDTH[size]), `poster-${stamp}${size === "a4" ? "" : `-${size}`}.png`);
    } catch {
      setImgError("画像にできませんでした。「印刷する」から、PDFに保存してください。");
    } finally {
      setImgBusy(false);
    }
  }
  const run = (action: "print" | "image") => (action === "print" ? window.print() : void saveImage());
  const sizeInfo = SIZES.find((x) => x.id === size) ?? SIZES[0];
  /** QRコードがあるのに、読み取りテストがまだのときは、先に、お知らせを出す(続けることも、できる) */
  const go = (action: "print" | "image") => {
    if (hasQr && !qrTested) setPending(action);
    else run(action);
  };
  return (
    <div>
      <div className="sizetabs no-print" role="group" aria-label="画像の大きさ">
        {SIZES.map((x) => (
          <button type="button" key={x.id} aria-pressed={x.id === size} onClick={() => setSize(x.id)}>
            <b>{x.label}</b>
            <small>{x.sub}</small>
          </button>
        ))}
      </div>
      <div ref={boxRef}>
        {size === "a4" ? (
          <Poster poster={poster} design={design} clinic={clinic} campaign={campaign} layout={layout} brand={brand} taste={taste} qr={qr} photo={photo} ts={ts} onChange={onChange} />
        ) : (
          <SnsCard poster={poster} design={design} brand={brand ?? ""} taste={taste ?? "clean"} qr={qr} clinic={clinic} campaign={campaign && validItems(campaign).length > 0 ? campaign : undefined} photo={photo} ts={ts} ratio={size} />
        )}
      </div>
      <p className="small center no-print">
        {size !== "a4"
          ? `${sizeInfo.label}用の画像です。文字・金額を直すときは、「A4ポスター」に戻って直します。`
          : campaign
            ? "タイトルとひとことは、押すと、その場で直せます。金額・期間は、上の入力欄で直します。"
            : "文字を押すと、その場で直せます。デザインは、上で選び直せます。"}
      </p>

      <div className="tools no-print">
        {size === "a4" && (
          <button type="button" className="main" onClick={() => go("print")}>
            印刷する(A4)
          </button>
        )}
        <button type="button" className={size === "a4" ? "" : "main"} onClick={() => go("image")} disabled={imgBusy}>
          {imgBusy ? "画像にしています…" : `画像で保存(PNG${size === "a4" ? "" : `・${sizeInfo.label}`})`}
        </button>
        <button type="button" onClick={onAgain}>
          もう一度つくる
        </button>
      </div>
      {pending && (
        <div className="qrgate no-print" role="alert">
          <b>QRコードの、読み取りテストが、まだです。</b>
          <span>スマホのカメラで、上のQRコードを読み取って、ページが開くか、確かめてから、進むと安心です。</span>
          <div className="row">
            <button
              type="button"
              className="mini"
              onClick={() => {
                onQrTested(true);
                const a = pending;
                setPending(null);
                run(a);
              }}
            >
              読み取れた。続ける
            </button>
            <button
              type="button"
              className="link"
              onClick={() => {
                const a = pending;
                setPending(null);
                run(a);
              }}
            >
              確認せずに続ける
            </button>
            <button type="button" className="link" onClick={() => setPending(null)}>
              やめる
            </button>
          </div>
        </div>
      )}
      {imgError && (
        <p role="alert" className="error no-print">
          {imgError}
        </p>
      )}
      {size === "a4" && <p className="small center no-print">「印刷する」の画面で、送り先を「PDFに保存」にすると、ファイルとして保存できます。</p>}
      <div className={`proof no-print${fixCount ? " has-fix" : ""}`} role="status">
        <b>{fixCount ? `記載もれ・誤記のチェック: 直したほうがよいものが、${fixCount}つあります。` : "記載もれ・誤記のチェック: 直す必要のあるものは、見つかりませんでした。"}</b>
        {issues.length > 0 && (
          <ul>
            {issues.map((i, k) => (
              <li key={k} className={i.level}>
                {i.level === "fix" ? "要確認: " : "お知らせ: "}
                {i.text}
              </li>
            ))}
          </ul>
        )}
      </div>
      {hasQr && (
        <div className="qrgate no-print">
          <b>印刷の前に: QRコードの読み取りテスト</b>
          <span>スマホのカメラで、上のポスターのQRコードを読み取って、ページが開くか確かめてください。印刷したものでも、一度、試してください(小さくなったり、白黒印刷だったりすると、読み取れないことがあります)。</span>
          <label className="chk">
            <input type="checkbox" checked={qrTested} onChange={(e) => onQrTested(e.target.checked)} />
            スマホで読み取って、ページが開きました
          </label>
        </div>
      )}
      <div className="no-print">
        <Findings findings={findings} />
      </div>
    </div>
  );
}

export function PostsResult({ posts, onChange, onAgain }: { posts: Post[]; onChange: (p: Post[]) => void; onAgain: () => void }) {
  const set = (i: number, patch: Partial<Post>) => onChange(posts.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div>
      {posts.map((p, i) => {
        const full = p.tags.length ? `${p.body}\n\n${tagsToText(p.tags)}` : p.body;
        return (
          <div className="post" key={i}>
            <div className="head">
              <span>{p.label}</span>
              <span className="small">{full.length}文字</span>
            </div>
            <textarea className="body" aria-label={`${p.label}の本文`} value={p.body} rows={Math.max(4, p.body.split("\n").length + 2)} onChange={(e) => set(i, { body: e.target.value })} />
            <input className="tagbox" aria-label={`${p.label}のハッシュタグ`} value={tagsToText(p.tags)} onChange={(e) => set(i, { tags: textToTags(e.target.value) })} />
            <Findings findings={checkText(p.body)} />
            <div className="foot">
              <span className="small">押すと、その場で直せます</span>
              <CopyButton text={full} />
            </div>
          </div>
        );
      })}
      <div className="tools">
        <button type="button" onClick={onAgain}>
          もう3案つくる
        </button>
      </div>
    </div>
  );
}

function scriptText(s: Script): string {
  const lines = [`【最初の一言】${s.hook}`, ...s.scenes.map((x, i) => `【場面${i + 1}】話す: ${x.say}${x.text ? `\n  画面の文字: ${x.text}` : ""}`)];
  return lines.join("\n");
}

export function ScriptsResult({ scripts, onChange, onAgain }: { scripts: Script[]; onChange: (s: Script[]) => void; onAgain: () => void }) {
  const set = (i: number, patch: Partial<Script>) => onChange(scripts.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const setScene = (i: number, k: number, patch: Partial<Script["scenes"][number]>) =>
    set(i, { scenes: scripts[i].scenes.map((x, j) => (j === k ? { ...x, ...patch } : x)) });
  return (
    <div>
      {scripts.map((s, i) => (
        <div className="post" key={i}>
          <div className="head">
            <span>{s.label}</span>
            <span className="small">{s.scenes.length}場面</span>
          </div>
          <label className="t">最初の一言</label>
          <textarea className="body" aria-label={`${s.label}の最初の一言`} rows={2} value={s.hook} onChange={(e) => set(i, { hook: e.target.value })} />
          {s.scenes.map((x, k) => (
            <div className="scene" key={k}>
              <span className="sn">{k + 1}</span>
              <div className="sb">
                <textarea className="body" aria-label={`${s.label}の場面${k + 1}の話す言葉`} rows={2} value={x.say} onChange={(e) => setScene(i, k, { say: e.target.value })} />
                <input className="tagbox" aria-label={`${s.label}の場面${k + 1}の画面の文字`} placeholder="画面に出す文字(なくてもOK)" value={x.text} onChange={(e) => setScene(i, k, { text: e.target.value })} />
              </div>
            </div>
          ))}
          <div className="foot">
            <span className="small">話す言葉(上)と、画面の文字(下)</span>
            <CopyButton text={scriptText(s)} label="台本をコピー" />
          </div>
          <label className="t">投稿につけるキャプション</label>
          <textarea className="body" aria-label={`${s.label}のキャプション`} rows={3} value={s.caption} onChange={(e) => set(i, { caption: e.target.value })} />
          <input className="tagbox" aria-label={`${s.label}のハッシュタグ`} value={tagsToText(s.tags)} onChange={(e) => set(i, { tags: textToTags(e.target.value) })} />
          <Findings findings={checkText(s.hook, ...s.scenes.flatMap((x) => [x.say, x.text]), s.caption)} />
          <div className="foot">
            <span />
            <CopyButton text={s.tags.length ? `${s.caption}\n\n${tagsToText(s.tags)}` : s.caption} label="キャプションをコピー" />
          </div>
        </div>
      ))}
      <div className="tools">
        <button type="button" onClick={onAgain}>
          もう2案つくる
        </button>
      </div>
    </div>
  );
}
