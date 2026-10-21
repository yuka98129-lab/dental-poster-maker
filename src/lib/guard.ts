import { createHash, timingSafeEqual } from "node:crypto";

// 合言葉(環境変数 CLINIC_PASSCODE)を知っている人だけが、AI を使える。AI の費用が、勝手に使われないようにするため。

const digest = (s: string) => createHash("sha256").update(s).digest();

/** ヘッダーには日本語を直接入れられないので、画面側は encodeURIComponent で送る。こちらで元に戻す */
export function readPasscode(req: Request): string | null {
  const raw = req.headers.get("x-passcode");
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

export function passcodeMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  return timingSafeEqual(digest(given), digest(expected));
}

/** key ごとに、windowMs のあいだに max 回まで。超えたら true */
export function createRateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string, now: number = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    }
    return recent.length > max;
  };
}

export function clientKey(req: Request): string {
  const f = req.headers.get("x-forwarded-for");
  return (f ? f.split(",")[0].trim() : "") || "unknown";
}

export function fail(status: number, code: string, message: string) {
  return Response.json({ error: code, message }, { status });
}
