"use client";

/* eslint-disable @next/next/no-img-element -- 写真は、端末の中のデータ(data URL)なので、画像の最適化は使わない */
import { useState, useSyncExternalStore } from "react";
import { ApiError, requestGenerate, verifyPasscode } from "../lib/client";
import { CAMPAIGN_LIMITS, EMPTY_ITEM, MAX_ITEMS, normalizeDraft, parseCampaign, priceWarning, validItems, type Campaign } from "../lib/campaign";
import { brandVars, DEFAULT_BRAND, isHex } from "../lib/color";
import { defaultName, newId, removeSaved, sanitizeSaved, upsertSaved, type SavedCampaign } from "../lib/saved";
import { DEFAULT_QR, normalizeQr, QR_LIMITS, type QrSettings } from "../lib/qr";
import { BRAND_KEY, QR_KEY, CAMPAIGN_KEY, CLINIC_KEY, DEFAULT_CLINIC, PASS_KEY, SAVED_KEY, VOICE_KEY, type Clinic } from "../lib/clinic";
import type { GenerateResult } from "../lib/generate";
import {
  AUDIENCES,
  DESIGNS,
  KINDS,
  LAYOUTS,
  TASTES,
  LIMITS,
  MODES,
  THEMES,
  TONES,
  themesFor,
  type AudienceId,
  type DesignId,
  type KindId,
  type LayoutId,
  type ModeId,
  type TasteId,
  type ToneId,
} from "../lib/options";
import { load, loadText, save, saveText } from "../lib/storage";
import { readPhoto } from "../lib/photo";
import { TEXT_SIZES, textScale, type TextSizeId } from "../lib/sizes";
import { TEMPLATE_GROUPS, TEMPLATES, type Template } from "../lib/templates";
import { APP_VERSION } from "../lib/version";
import type { Post } from "../lib/parse";
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
  const [design, setDesign] = useState<DesignId>("navy");
  const [taste, setTaste] = useState<TasteId>("clean");
  const [layout, setLayout] = useState<LayoutId>("badge");
  const [topic, setTopic] = useState("");
  const [memo, setMemo] = useState("");
  const [voice, setVoice] = useState(() => loadText(VOICE_KEY));
  const [clinic, setClinic] = useState<Clinic>(() => load(CLINIC_KEY, DEFAULT_CLINIC));
  const [campaign, setCampaign] = useState<Campaign>(() => normalizeDraft(load<Campaign>(CAMPAIGN_KEY, normalizeDraft(null))));

  const [brand, setBrand] = useState<string>(() => {
    const v = loadText(BRAND_KEY);
    return isHex(v) ? v : DEFAULT_BRAND;
  });
  const [saved, setSaved] = useState<SavedCampaign[]>(() => {
    try {
      return sanitizeSaved(JSON.parse(loadText(SAVED_KEY) || "[]"));
    } catch {
      return [];
    }
  });
  const [qr, setQr] = useState<QrSettings>(() => {
    try {
      return normalizeQr(JSON.parse(loadText(QR_KEY) || "null"));
    } catch {
      return DEFAULT_QR;
    }
  });
  const [qrTested, setQrTested] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [confirmDel, setConfirmDel] = useState("");

  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [textSize, setTextSize] = useState<TextSizeId>("m");
  const [tplNote, setTplNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [snsPosts, setSnsPosts] = useState<Post[] | null>(null);
  const [snsBusy, setSnsBusy] = useState(false);
  const [snsError, setSnsError] = useState("");

  function clearOutputs() {
    setResult(null);
    setSnsPosts(null);
    setSnsError("");
  }

  function pickMode(m: ModeId) {
    setMode(m);
    setTheme(themesFor(m)[0].id);
    setAudience(m === "self" ? "junior" : "all");
    if (m === "self" && kind === "poster") setKind("sns");
    setTplNote("");
    clearOutputs();
  }

  function updateClinic(patch: Partial<Clinic>) {
    const next = { ...clinic, ...patch };
    setClinic(next);
    save(CLINIC_KEY, next);
  }

  function updateCampaign(next: Campaign) {
    setCampaign(next);
    save(CAMPAIGN_KEY, next);
  }
  const setItem = (i: number, patch: Partial<Campaign["items"][number]>) =>
    updateCampaign({ ...campaign, items: campaign.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  function updateBrand(v: string) {
    setBrand(v);
    saveText(BRAND_KEY, v);
  }
  function updateQr(next: QrSettings) {
    if (next.on !== qr.on || next.url !== qr.url) setQrTested(false); // URLが変わったら、読み取りテストは、やり直し
    setQr(next);
    saveText(QR_KEY, JSON.stringify(next));
  }
  function pickTaste(id: TasteId) {
    setTaste(id);
    setDesign(TASTES.find((t) => t.id === id)?.design ?? "navy");
  }
  function persistSaved(next: SavedCampaign[]) {
    setSaved(next);
    saveText(SAVED_KEY, JSON.stringify(next));
  }
  function saveCurrent() {
    const name = saveName.trim() || defaultName(campaign);
    persistSaved(upsertSaved(saved, { id: newId(), name, savedAt: Date.now(), campaign, design, layout, taste, qr, brand, poster: result?.kind === "poster" ? result.poster : null }));
    setSaveName("");
  }
  function recall(s: SavedCampaign) {
    setMode("clinic");
    setKind("poster");
    setTheme("campaign");
    updateCampaign(s.campaign);
    setDesign(s.design);
    setLayout(s.layout);
    setTaste(s.taste);
    updateQr(s.qr);
    if (s.brand) updateBrand(s.brand);
    setSnsPosts(null);
    setSnsError("");
    setResult(s.poster ? { kind: "poster", poster: s.poster } : null);
  }

  function pickTheme(id: string) {
    setTheme(id);
    if (id === "campaign") setDesign(TASTES.find((t) => t.id === taste)?.design ?? "navy");
    setTplNote("");
    clearOutputs();
  }

  /** テンプレートを選ぶ。テーマと、内容のたたき台が入る(日付・金額は、入れない) */
  function applyTemplate(t: Template) {
    setMode("clinic");
    setAudience("all");
    setTheme(t.theme);
    setTopic(t.topic ?? "");
    setMemo("");
    if (t.theme === "campaign") {
      setDesign(TASTES.find((x) => x.id === taste)?.design ?? "navy");
      const empty = campaign.items.every((i) => !i.name && !i.regular && !i.sale);
      if (empty) updateCampaign({ ...campaign, items: (t.menus ?? [""]).map((name) => ({ ...EMPTY_ITEM, name })) });
    }
    setTplNote(`「${t.label}」を入れました。${t.next}`);
    clearOutputs();
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError("");
    try {
      setPhoto(await readPhoto(file));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "写真を読み込めませんでした。");
    }
  }

  // 「キャンペーン」のテーマでは、メニューと金額が、1つはそろうまで、つくれない
  const isCampaign = theme === "campaign";
  const readyCampaign = parseCampaign(campaign);
  const campaignReady = !isCampaign || validItems(readyCampaign).length > 0;

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const r = await requestGenerate(passcode, { mode, kind, theme, topic, audience, tone, memo, voice, campaign: readyCampaign, basedOn: "" });
      setResult(r);
      setSnsPosts(null);
      setSnsError("");
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

  /** できたポスターの内容で、SNSの文章もつくる(同じ内容・同じ金額で、そろえる) */
  async function makeSns() {
    if (result?.kind !== "poster") return;
    const p = result.poster;
    const basedOn = [`タイトル: ${p.title.replace(/\s+/g, " ")}`, p.catchcopy && `ひとこと: ${p.catchcopy}`, ...p.points.map((x) => `- ${x.text}`)].filter(Boolean).join("\n");
    setSnsBusy(true);
    setSnsError("");
    try {
      const r = await requestGenerate(passcode, { mode, kind: "sns", theme, topic, audience, tone, memo, voice, campaign: readyCampaign, basedOn });
      if (r.kind === "sns") setSnsPosts(r.posts);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        saveText(PASS_KEY, "");
        setPasscode("");
        setGateNote("合言葉が違うか、変わりました。もう一度入れてください。");
      } else {
        setSnsError(err instanceof Error ? err.message : "うまくいきませんでした。");
      }
    } finally {
      setSnsBusy(false);
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
    (isCampaign
      ? "補足があれば(任意)。金額と期間は、上の入力欄に入れます"
      : mode === "self"
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
        <Seg label="つくるもの" value={kind} options={KINDS.filter((k) => mode === "clinic" || k.id !== "poster")} onPick={(k) => { setKind(k); clearOutputs(); }} big />
      </section>

      <section className="card no-print" aria-labelledby="s2">
        <h2 id="s2">
          <span className="n">2</span>テーマと雰囲気
        </h2>
        {mode === "clinic" && (
          <details className="tplbox">
            <summary>季節・イベントのテンプレートから始める</summary>
            {TEMPLATE_GROUPS.map((g) => (
              <div className="tplgroup" key={g.id}>
                <p className="t">{g.label}</p>
                <div className="seg">
                  {TEMPLATES.filter((t) => t.group === g.id).map((t) => (
                    <button type="button" key={t.id} className="chip" onClick={() => applyTemplate(t)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="small">日付と金額は、自分で入れます(テンプレートには、入っていません)。</p>
          </details>
        )}
        {tplNote && <p className="tpl-note" role="status">{tplNote}</p>}
        <Seg label="テーマ" value={theme} options={themesFor(mode)} onPick={pickTheme} />
        {theme === "free" && (
          <>
            <label className="t" htmlFor="topic">
              テーマの内容
            </label>
            <input id="topic" type="text" maxLength={LIMITS.topic} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例: 新しい電動歯ブラシの選び方" />
          </>
        )}
        {isCampaign && (
          <fieldset className="camp">
            <legend className="t">料金・期間(自分で入れます。AIは、数字を作りません)</legend>
            {campaign.items.map((it, i) => (
              <div className="menu-row" key={i}>
                <div className="full">
                  <label className="t" htmlFor={`m-name-${i}`}>
                    メニュー{i + 1}の名前
                  </label>
                  <input id={`m-name-${i}`} type="text" maxLength={CAMPAIGN_LIMITS.name} value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder="例: オフィスホワイトニング" />
                </div>
                <div>
                  <label className="t" htmlFor={`m-reg-${i}`}>
                    通常の金額(円。なくてもOK)
                  </label>
                  <input id={`m-reg-${i}`} type="text" inputMode="numeric" maxLength={9} value={it.regular} onChange={(e) => setItem(i, { regular: e.target.value })} placeholder="例: 33000" />
                </div>
                <div>
                  <label className="t" htmlFor={`m-sale-${i}`}>
                    キャンペーンの金額(円)
                  </label>
                  <input id={`m-sale-${i}`} type="text" inputMode="numeric" maxLength={9} value={it.sale} onChange={(e) => setItem(i, { sale: e.target.value })} placeholder="例: 15000" />
                </div>
                {priceWarning(it) && <p className="small warn-line full">{priceWarning(it)}</p>}
                {campaign.items.length > 1 && (
                  <button type="button" className="link full" onClick={() => updateCampaign({ ...campaign, items: campaign.items.filter((_, j) => j !== i) })}>
                    メニュー{i + 1}を消す
                  </button>
                )}
              </div>
            ))}
            {campaign.items.length < MAX_ITEMS && (
              <button type="button" className="addrow" onClick={() => updateCampaign({ ...campaign, items: [...campaign.items, { ...EMPTY_ITEM }] })}>
                メニューを足す(あと{MAX_ITEMS - campaign.items.length}つ)
              </button>
            )}
            <div className="grid2">
              <div>
                <label className="t" htmlFor="m-period">
                  期間
                </label>
                <input id="m-period" type="text" maxLength={CAMPAIGN_LIMITS.period} value={campaign.period} onChange={(e) => updateCampaign({ ...campaign, period: e.target.value })} placeholder="例: 10/31まで" />
              </div>
              <div>
                <label className="t" htmlFor="m-cond">
                  条件
                </label>
                <input id="m-cond" type="text" maxLength={CAMPAIGN_LIMITS.condition} value={campaign.condition} onChange={(e) => updateCampaign({ ...campaign, condition: e.target.value })} placeholder="例: 平日限定" />
              </div>
            </div>
            <p className="small">入れた内容は、この端末に覚えておきます(来月は、直すだけです)。</p>
            <div className="saved">
              <p className="t">保存したキャンペーン({saved.length}件)</p>
              <div className="saverow">
                <input type="text" maxLength={40} value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="名前(なければ、自動でつけます)" aria-label="保存する名前" />
                <button type="button" className="addrow" onClick={saveCurrent} disabled={!campaignReady}>
                  いまの内容を保存
                </button>
              </div>
              <p className="small">ポスターができていれば、文章も、いっしょに保存します。保存は、この端末の中だけです。</p>
              {saved.map((x) => (
                <div className="saved-item" key={x.id}>
                  <span className="sn">{x.name}</span>
                  <span className="small">{new Date(x.savedAt).toLocaleDateString("ja-JP")}</span>
                  <button type="button" className="mini" onClick={() => recall(x)} aria-label={`${x.name}を呼び出す`}>
                    呼び出す
                  </button>
                  <button
                    type="button"
                    className="link"
                    aria-label={`${x.name}を消す`}
                    onClick={() => {
                      if (confirmDel === x.id) {
                        persistSaved(removeSaved(saved, x.id));
                        setConfirmDel("");
                      } else setConfirmDel(x.id);
                    }}
                  >
                    {confirmDel === x.id ? "本当に消す" : "消す"}
                  </button>
                </div>
              ))}
            </div>
          </fieldset>
        )}
        <div className="grid2">
          <Seg label="だれに向けて?" value={audience} options={AUDIENCES} onPick={setAudience} />
          <Seg label="雰囲気は?" value={tone} options={TONES} onPick={setTone} />
        </div>
        {kind === "poster" && (
          <div>
            <p className="t">デザインのテイスト(ワンタップで、雰囲気が決まります)</p>
            <div className="tastes" role="group" aria-label="デザインのテイスト">
              {TASTES.map((t) => {
                const d = DESIGNS.find((x) => x.id === t.design) ?? DESIGNS[0];
                const sw = t.design === "sakura" ? { from: "#fdeaf1", to: "#b2406b" } : d;
                return (
                  <button type="button" key={t.id} className="taste" aria-pressed={t.id === taste} onClick={() => pickTaste(t.id)}>
                    <i style={{ background: `linear-gradient(135deg, ${sw.from}, ${sw.to})` }} />
                    <b>{t.label}</b>
                    <small>{t.sub}</small>
                  </button>
                );
              })}
            </div>
            <p className="t">色だけ変える(テイストの色から、変えられます)</p>
            <div className="swatches" role="group" aria-label="ポスターのデザイン">
              {DESIGNS.map((d) => (
                <button type="button" key={d.id} className="sw" aria-pressed={d.id === design} onClick={() => setDesign(d.id)}>
                  <i style={{ background: `linear-gradient(135deg, ${d.from}, ${d.to})` }} />
                  {d.label}
                </button>
              ))}
              <button type="button" className="sw" aria-pressed={design === "custom"} onClick={() => setDesign("custom")}>
                <i style={{ background: `linear-gradient(135deg, ${brandVars(brand)["--pbg"]}, ${brandVars(brand)["--pd"]})` }} />
                自分の色
              </button>
            </div>
            {design === "custom" && (
              <div className="colorrow">
                <label className="t" htmlFor="brand">
                  医院の色(ロゴの色などに合わせます)
                </label>
                <input id="brand" type="color" value={brand} onChange={(e) => updateBrand(e.target.value)} />
                <span className="small">{brand}。白い文字が読めるように、明るい色は、少し濃くします。</span>
              </div>
            )}
            {isCampaign && <Seg label="ポスターの型" value={layout} options={LAYOUTS} onPick={setLayout} />}
            <Seg label="文字の大きさ(ポスター・SNS用の画像)" value={textSize} options={TEXT_SIZES} onPick={setTextSize} />
          </div>
        )}
        {kind === "poster" && (
          <fieldset className="photoset">
            <legend className="t">写真(任意。なくても、きれいにできます)</legend>
            <div className="photorow">
              {photo && <img src={photo} alt="選んだ写真" />}
              <div>
                <label className="t" htmlFor="photo">
                  {photo ? "写真を変える" : "写真を選ぶ"}
                </label>
                <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
              {photo && (
                <button type="button" className="link" onClick={() => setPhoto(null)}>
                  写真をはずす
                </button>
              )}
            </div>
            {photoError && <p role="alert" className="error">{photoError}</p>}
            <p className="small">
              患者さんが写っている写真や、だれかが分かる写真は、使わないでください(院内の様子・器具・イラストなど)。自分で撮った写真か、使ってよいと決まっている写真だけを使います。写真は、この端末の中だけで使い、どこにも送りません。保存したキャンペーンにも、入りません。ふつうのポスターと期間バッジ型は絵の場所に、カード型は上の帯の背景に入ります。
            </p>
          </fieldset>
        )}
        {kind === "poster" && (
          <fieldset className="qrset">
            <legend className="t">QRコード(予約ページなど。ポスターの右下に置きます)</legend>
            <label className="chk">
              <input type="checkbox" checked={qr.on} onChange={(e) => updateQr({ ...qr, on: e.target.checked })} />
              QRコードを入れる
            </label>
            {qr.on && (
              <>
                <div>
                  <label className="t" htmlFor="qr-url">
                    QRコードにする、ページのURL
                  </label>
                  <input id="qr-url" type="url" inputMode="url" maxLength={QR_LIMITS.url} value={qr.url} onChange={(e) => updateQr({ ...qr, url: e.target.value })} placeholder="https://example.com/yoyaku" />
                  {clinic.web && clinic.web !== qr.url && (
                    <button type="button" className="link" onClick={() => updateQr({ ...qr, url: clinic.web })}>
                      医院のホームページのURLを入れる
                    </button>
                  )}
                </div>
                <div>
                  <label className="t" htmlFor="qr-label">
                    QRコードの下の言葉(8文字まで)
                  </label>
                  <input id="qr-label" type="text" maxLength={QR_LIMITS.label} value={qr.label} onChange={(e) => updateQr({ ...qr, label: e.target.value })} placeholder="例: ご予約はこちら" />
                </div>
                <p className="small">QRコードは、この端末の中だけで作ります。URLは、どこにも送りません。印刷の前に、スマホで読み取りテストをしてください。</p>
              </>
            )}
          </fieldset>
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
                <label className="t" htmlFor="c-web">ホームページのURL(任意)</label>
                <input id="c-web" type="url" inputMode="url" value={clinic.web} onChange={(e) => updateClinic({ web: e.target.value })} placeholder="https://" />
              </div>
              <div>
                <label className="t" htmlFor="c-closing">ポスターの最後の言葉</label>
                <input id="c-closing" type="text" value={clinic.closing} onChange={(e) => updateClinic({ closing: e.target.value })} placeholder="例: お気軽にご相談ください" />
              </div>
            </div>
            <p className="small">患者さんの名前や情報は、入れません。医院の案内だけです。</p>
          </details>
        )}

        <button type="button" className="go" onClick={() => void generate()} disabled={busy || !campaignReady || (theme === "free" && !topic.trim())}>
          {busy ? "つくっています…(10〜30秒ほど)" : "AIでつくる"}
        </button>
        {!campaignReady && <p className="small center">メニューの名前と、キャンペーンの金額を、1つ入れると、つくれます。</p>}
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
            <PosterResult poster={result.poster} design={design} clinic={clinic} campaign={isCampaign ? readyCampaign : undefined} proofCampaign={isCampaign ? campaign : undefined} layout={layout} brand={brand} taste={taste} qr={qr} photo={photo} ts={textScale(textSize)} qrTested={qrTested} onQrTested={setQrTested} onChange={(poster) => setResult({ kind: "poster", poster })} onAgain={() => void generate()} />
          )}
          {result.kind === "poster" && (
            <div className="sns-from no-print">
              <h3>同じ内容で、SNSの文章も</h3>
              <p className="small">このポスターの内容(タイトル・ポイント・金額・期間)に、そろえて、SNSの投稿文を3案つくります。</p>
              <button type="button" className="go" onClick={() => void makeSns()} disabled={snsBusy}>
                {snsBusy ? "つくっています…(10〜30秒ほど)" : snsPosts ? "SNSの文章を、つくり直す" : "このポスターの内容で、SNSの文章をつくる"}
              </button>
              {snsError && <p role="alert" className="error">{snsError}</p>}
              {snsPosts && <PostsResult posts={snsPosts} onChange={setSnsPosts} onAgain={() => void makeSns()} />}
            </div>
          )}
          {result.kind === "sns" && <PostsResult posts={result.posts} onChange={(posts) => setResult({ kind: "sns", posts })} onAgain={() => void generate()} />}
          {result.kind === "script" && <ScriptsResult scripts={result.scripts} onChange={(scripts) => setResult({ kind: "script", scripts })} onAgain={() => void generate()} />}
          <p className="small no-print" style={{ marginTop: 12 }}>
            AIが作った文章です。内容と、院内(職場)のルールに合っているか、必ず確認してから使ってください。医療広告のチェックは目安で、最終的な確認は、医院でお願いします。
          </p>
        </section>
      )}

      <p className="foot-note no-print">患者さんの個人情報は、入れないでください。入れるのは、テーマと、医院の案内だけです。</p>
      <p className="foot-note no-print" data-testid="version">バージョン {APP_VERSION}</p>
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
