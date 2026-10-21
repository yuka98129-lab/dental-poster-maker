"use client";

import { useState, useSyncExternalStore } from "react";
import { ApiError, requestGenerate, verifyPasscode } from "../lib/client";
import { CLINIC_KEY, DEFAULT_CLINIC, PASS_KEY, VOICE_KEY, type Clinic } from "../lib/clinic";
import type { GenerateResult } from "../lib/generate";
import {
  AUDIENCES,
  DESIGNS,
  KINDS,
  LIMITS,
  MODES,
  THEMES,
  TONES,
  themesFor,
  type AudienceId,
  type DesignId,
  type KindId,
  type ModeId,
  type ToneId,
} from "../lib/options";
import { load, loadText, save, saveText } from "../lib/storage";
import { PostsResult, PosterResult, ScriptsResult } from "./Results";

type SegProps<T extends string> = { label?: string; value: T; options: readonly { id: T; label: string; sub?: string }[]; onPick: (v: T) => void; big?: boolean };

function Seg<T extends string>({ label, value, options, onPick, big }: SegProps<T>) {
  return (
    <div>
      {label && <p className="t">{label}</p>}
      <div className={`seg${big ? " big" : ""}`} role="group" aria-label={label}>
        {options.map((o) => (
          <button type="button" key={o.id} className={big ? "" : "chip"} aria-pressed={o.id === value} onClick={() => onPick(o.id)}>
            {o.label}
            {o.sub && <small>{o.sub}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Gate({ onOk }: { onOk: (passcode: string) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setError("");
    try {
      await verifyPasscode(value.trim());
      onOk(value.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "うまくいきませんでした。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card gate" onSubmit={(e) => void submit(e)}>
      <h2>合言葉を入れてください</h2>
      <p className="small">院内で決めた合言葉を知っている人だけが、使えます(AIの費用を、守るためです)。</p>
      <label className="t" htmlFor="pass">
        合言葉
      </label>
      <input id="pass" type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button type="submit" className="go" disabled={busy || !value.trim()}>
        {busy ? "確認しています…" : "入る"}
      </button>
    </form>
  );
}

function MakerInner() {
  const [passcode, setPasscode] = useState(() => loadText(PASS_KEY));
  const [gateNote, setGateNote] = useState("");

  const [mode, setMode] = useState<ModeId>("clinic");
  const [kind, setKind] = useState<KindId>("poster");
  const [theme, setTheme] = useState("recall");
  const [audience, setAudience] = useState<AudienceId>("all");
  const [tone, setTone] = useState<ToneId>("soft");
  const [design, setDesign] = useState<DesignId>("mint");
  const [topic, setTopic] = useState("");
  const [memo, setMemo] = useState("");
  const [voice, setVoice] = useState(() => loadText(VOICE_KEY));
  const [clinic, setClinic] = useState<Clinic>(() => load(CLINIC_KEY, DEFAULT_CLINIC));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);

  function pickMode(m: ModeId) {
    setMode(m);
    setTheme(themesFor(m)[0].id);
    setAudience(m === "self" ? "junior" : "all");
    if (m === "self" && kind === "poster") setKind("sns");
    setResult(null);
  }

  function updateClinic(patch: Partial<Clinic>) {
    const next = { ...clinic, ...patch };
    setClinic(next);
    save(CLINIC_KEY, next);
  }

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const r = await requestGenerate(passcode, { mode, kind, theme, topic, audience, tone, memo, voice });
      setResult(r);
      saveText(VOICE_KEY, voice);
      setTimeout(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        saveText(PASS_KEY, "");
        setPasscode("");
        setGateNote("合言葉が違うか、変わりました。もう一度入れてください。");
      } else {
        setError(err instanceof Error ? err.message : "うまくいきませんでした。");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!passcode) {
    return (
      <main className="wrap">
        <Header />
        {gateNote && <p className="note-warn">{gateNote}</p>}
        <Gate
          onOk={(p) => {
            saveText(PASS_KEY, p);
            setPasscode(p);
            setGateNote("");
          }}
        />
      </main>
    );
  }

  const themeInfo = THEMES.find((t) => t.id === theme);
  const memoHint =
    themeInfo?.needsMemo ??
    (mode === "self"
      ? "実際にあった出来事や、伝えたい一言(患者さんが特定できる情報は、書かないでください)"
      : "例: 10月は衛生士のクリーニング枠が増えました");

  return (
    <main className="wrap">
      <Header clinicName={mode === "clinic" ? clinic.name : ""} />

      <section className="card no-print" aria-labelledby="s1">
        <h2 id="s1">
          <span className="n">1</span>何をつくりますか?
        </h2>
        <Seg label="だれの発信?" value={mode} options={MODES} onPick={pickMode} />
        <Seg label="つくるもの" value={kind} options={KINDS.filter((k) => mode === "clinic" || k.id !== "poster")} onPick={(k) => { setKind(k); setResult(null); }} big />
      </section>

      <section className="card no-print" aria-labelledby="s2">
        <h2 id="s2">
          <span className="n">2</span>テーマと雰囲気
        </h2>
        <Seg label="テーマ" value={theme} options={themesFor(mode)} onPick={setTheme} />
        {theme === "free" && (
          <>
            <label className="t" htmlFor="topic">
              テーマの内容
            </label>
            <input id="topic" type="text" maxLength={LIMITS.topic} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例: 新しい電動歯ブラシの選び方" />
          </>
        )}
        <div className="grid2">
          <Seg label="だれに向けて?" value={audience} options={AUDIENCES} onPick={setAudience} />
          <Seg label="雰囲気は?" value={tone} options={TONES} onPick={setTone} />
        </div>
        {kind === "poster" && (
          <div>
            <p className="t">ポスターのデザイン(あとから変えられます)</p>
            <div className="swatches" role="group" aria-label="ポスターのデザイン">
              {DESIGNS.map((d) => (
                <button type="button" key={d.id} className="sw" aria-pressed={d.id === design} onClick={() => setDesign(d.id)}>
                  <i style={{ background: `linear-gradient(135deg, ${d.from}, ${d.to})` }} />
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="t" htmlFor="memo">
          ひとこと足す{themeInfo?.needsMemo ? "(休診の日付を入れてください)" : "(任意)"}
        </label>
        <textarea id="memo" rows={3} maxLength={LIMITS.memo} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={memoHint} />

        {mode === "self" ? (
          <>
            <label className="t" htmlFor="voice">
              自分の口調のメモ(任意。一度書くと、覚えておきます)
            </label>
            <input id="voice" type="text" maxLength={LIMITS.voice} value={voice} onChange={(e) => setVoice(e.target.value)} placeholder="例: です・ます調で、少しやわらかく。「〜ですよね」をよく使う" />
          </>
        ) : (
          <details>
            <summary>医院の情報(一度入れると、覚えておきます)</summary>
            <div className="grid2">
              <div>
                <label className="t" htmlFor="c-name">医院名</label>
                <input id="c-name" type="text" value={clinic.name} onChange={(e) => updateClinic({ name: e.target.value })} />
              </div>
              <div>
                <label className="t" htmlFor="c-phone">電話</label>
                <input id="c-phone" type="text" value={clinic.phone} onChange={(e) => updateClinic({ phone: e.target.value })} />
              </div>
              <div>
                <label className="t" htmlFor="c-hours">診療時間</label>
                <input id="c-hours" type="text" value={clinic.hours} onChange={(e) => updateClinic({ hours: e.target.value })} placeholder="例: 9:00〜18:00(木・日・祝 休診)" />
              </div>
              <div>
                <label className="t" htmlFor="c-closing">ポスターの最後の言葉</label>
                <input id="c-closing" type="text" value={clinic.closing} onChange={(e) => updateClinic({ closing: e.target.value })} placeholder="例: お気軽にご相談ください" />
              </div>
            </div>
            <p className="small">患者さんの名前や情報は、入れません。医院の案内だけです。</p>
          </details>
        )}

        <button type="button" className="go" onClick={() => void generate()} disabled={busy || (theme === "free" && !topic.trim())}>
          {busy ? "つくっています…(10〜30秒ほど)" : "AIでつくる"}
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>

      {result && (
        <section className="card" id="result" aria-labelledby="s3">
          <h2 id="s3" className="no-print">
            <span className="n">3</span>できあがり
          </h2>
          {result.kind === "poster" && (
            <PosterResult poster={result.poster} design={design} clinic={clinic} onChange={(poster) => setResult({ kind: "poster", poster })} onAgain={() => void generate()} />
          )}
          {result.kind === "sns" && <PostsResult posts={result.posts} onChange={(posts) => setResult({ kind: "sns", posts })} onAgain={() => void generate()} />}
          {result.kind === "script" && <ScriptsResult scripts={result.scripts} onChange={(scripts) => setResult({ kind: "script", scripts })} onAgain={() => void generate()} />}
          <p className="small no-print" style={{ marginTop: 12 }}>
            AIが作った文章です。内容と、院内(職場)のルールに合っているか、必ず確認してから使ってください。医療広告のチェックは目安で、最終的な確認は、医院でお願いします。
          </p>
        </section>
      )}

      <p className="foot-note no-print">患者さんの個人情報は、入れないでください。入れるのは、テーマと、医院の案内だけです。</p>
    </main>
  );
}

function Header({ clinicName }: { clinicName?: string }) {
  return (
    <header className="no-print">
      <div className="logo" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
          <path d="M7.5 3C5 3 3.5 5 3.5 7.5c0 2 .7 3.4 1.2 5 .6 2 .6 4.5 1.6 7 .4 1 1.4 1.5 2.2 1 1-.6 1.2-2.6 1.8-4 .3-.8.8-1.2 1.4-1.2h.6c.6 0 1.1.4 1.4 1.2.6 1.4.8 3.4 1.8 4 .8.5 1.8 0 2.2-1 1-2.5 1-5 1.6-7 .5-1.6 1.2-3 1.2-5C21.5 5 20 3 17.5 3c-2.2 0-3.2 1-5.5 1S9.7 3 7.5 3z" />
        </svg>
      </div>
      <h1>ポスター・SNSメーカー</h1>
      {clinicName && <span className="clinic">{clinicName}</span>}
    </header>
  );
}

/** 端末に保存した設定を読むので、画面が出てから動かす(最初の描画は、サーバーと同じにする) */
export function Maker() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return mounted ? <MakerInner /> : <main className="wrap"><p className="small center" style={{ padding: 40 }}>読み込んでいます…</p></main>;
}
