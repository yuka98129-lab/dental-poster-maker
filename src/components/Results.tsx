"use client";

import { useState } from "react";
import { checkText } from "../lib/ad-check";
import type { Clinic } from "../lib/clinic";
import type { DesignId } from "../lib/options";
import type { Post, Poster as PosterData, Script } from "../lib/parse";
import { Findings } from "./Findings";
import { Poster } from "./Poster";

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

export function PosterResult({ poster, design, clinic, onChange, onAgain }: { poster: PosterData; design: DesignId; clinic: Clinic; onChange: (p: PosterData) => void; onAgain: () => void }) {
  const findings = checkText(poster.badge, poster.title, poster.catchcopy, ...poster.points.map((p) => p.text), clinic.closing);
  return (
    <div>
      <Poster poster={poster} design={design} clinic={clinic} onChange={onChange} />
      <p className="small center no-print">文字を押すと、その場で直せます。デザインは、上で選び直せます。</p>
      <div className="tools no-print">
        <button type="button" className="main" onClick={() => window.print()}>
          印刷する(A4)
        </button>
        <button type="button" onClick={onAgain}>
          もう一度つくる
        </button>
      </div>
      <p className="small center no-print">「印刷する」の画面で、送り先を「PDFに保存」にすると、ファイルとして保存できます。</p>
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
