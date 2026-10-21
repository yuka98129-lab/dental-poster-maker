// AI の返答を、安全な形に整える。形が崩れていたら、捨てる(画面に壊れた文字を出さない)。

export type Poster = { badge: string; title: string; catchcopy: string; points: { label: string; text: string }[] };
export type Post = { label: string; body: string; tags: string[] };
export type Script = { label: string; hook: string; scenes: { say: string; text: string }[]; caption: string; tags: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parsePoster(raw: unknown): Poster | null {
  if (!isRecord(raw)) return null;
  const title = s(raw.title, 40);
  if (!title) return null;
  const points = (Array.isArray(raw.points) ? raw.points : [])
    .map((p) => (isRecord(p) ? { label: s(p.label, 8), text: s(p.text, 40) } : null))
    .filter((p): p is { label: string; text: string } => p !== null && p.text !== "")
    .slice(0, 4);
  if (points.length === 0) return null;
  return { badge: s(raw.badge, 16), title, catchcopy: s(raw.catchcopy, 60), points };
}

/** ハッシュタグは、先頭に # を付け、空白を除く。重複は除いて、5個まで */
export function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const t of raw) {
    const w = s(t, 30).replace(/[#＃\s]/g, "");
    if (w) seen.add(`#${w}`);
    if (seen.size >= 5) break;
  }
  return [...seen];
}

export function parsePosts(raw: unknown): Post[] {
  if (!Array.isArray(raw)) return [];
  const posts: Post[] = [];
  for (const p of raw) {
    if (!isRecord(p)) continue;
    const body = s(p.body, 500);
    if (!body) continue;
    posts.push({ label: s(p.label, 12) || `案${posts.length + 1}`, body, tags: normalizeTags(p.tags) });
    if (posts.length >= 3) break;
  }
  return posts;
}

/** 動画の台本。最初の一言と、話す言葉のある場面が2つ以上あるものだけを、2案まで */
export function parseScripts(raw: unknown): Script[] {
  if (!Array.isArray(raw)) return [];
  const scripts: Script[] = [];
  for (const r of raw) {
    if (!isRecord(r)) continue;
    const hook = s(r.hook, 80);
    const scenes = (Array.isArray(r.scenes) ? r.scenes : [])
      .map((x) => (isRecord(x) ? { say: s(x.say, 120), text: s(x.text, 40) } : null))
      .filter((x): x is { say: string; text: string } => x !== null && x.say !== "")
      .slice(0, 6);
    if (!hook || scenes.length < 2) continue;
    scripts.push({ label: s(r.label, 12) || `案${scripts.length + 1}`, hook, scenes, caption: s(r.caption, 300), tags: normalizeTags(r.tags) });
    if (scripts.length >= 2) break;
  }
  return scripts;
}
